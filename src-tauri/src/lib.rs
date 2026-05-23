use arboard::Clipboard;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use sysinfo::{Disks, Networks, System};
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
// ─── PTY State ───────────────────────────────────────────────────────────────

type SharedChild = Arc<Mutex<Option<Box<dyn portable_pty::Child + Send + Sync>>>>;

struct PtySession {
    writer: Box<dyn Write + Send>,
    kill_tx: mpsc::Sender<()>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    child: SharedChild,
}

#[derive(Default)]
struct PtyStore(Mutex<HashMap<u32, PtySession>>);

static PTY_COUNTER: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(1);
static ACTIVE_READERS: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);

// ─── Helper ──────────────────────────────────────────────────────────────────

fn force_kill_child(child: &SharedChild) {
    if let Ok(mut guard) = child.lock() {
        if let Some(ref mut c) = *guard {
            let _ = c.kill();
            let _ = c.wait();
        }
        *guard = None;
    }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
async fn spawn_pty(
    shell: String,
    cols: Option<u16>,
    rows: Option<u16>,
    app: AppHandle,
    store: tauri::State<'_, PtyStore>,
) -> Result<u32, String> {
    let id = PTY_COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    println!(
        "[EZZO] Spawning PTY {} with shell: {} ({}x{})",
        id,
        shell,
        cols.unwrap_or(80),
        rows.unwrap_or(24)
    );

    let pty_system = native_pty_system();

    let size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("openpty: {}", e))?;

    // Build shell command
    let cmd = if shell == "cmd" {
        let mut c = CommandBuilder::new("cmd.exe");
        c.arg("/K");
        c.env("TERM", "xterm-256color");
        c
    } else if shell == "wsl" {
        let mut c = CommandBuilder::new("wsl.exe");
        c.env("TERM", "xterm-256color");
        c
    } else {
        let mut c = CommandBuilder::new("powershell.exe");
        c.args(["-NoLogo", "-NoExit", "-NoProfile"]);
        c.env("TERM", "xterm-256color");
        c
    };

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("spawn: {}", e))?;

    let shared_child: SharedChild = Arc::new(Mutex::new(Some(child)));

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let (kill_tx, mut kill_rx) = mpsc::channel::<()>(1);
    let app_clone = app.clone();
    let event_name = format!("pty_output_{}", id);
    let child_for_reader = shared_child.clone();

    // Spawn reader task — uses a dedicated OS thread (spawn_blocking) so it can do blocking I/O.
    // We now use a 50ms polling loop to check the kill signal BETWEEN reads, so that
    // even if data is streaming continuously, we never block for more than ~50ms
    // before recognising a kill command.
    ACTIVE_READERS.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    tokio::task::spawn_blocking(move || {
        use std::io::ErrorKind;
        println!("[EZZO] PTY {} reader started", id);
        let mut buf = [0u8; 4096];

        // Configure pipe reader for non-blocking mode on Windows
        // portable-pty uses named pipes on Windows — these are inherently non-blocking
        // with WouldBlock errors; on Unix we could use set_read_timeout or fcntl.

        loop {
            // ── Check kill signal before every read ──────────────────────────
            if kill_rx.try_recv().is_ok() {
                println!("[EZZO] PTY {} kill signal received", id);
                break;
            }

            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF — process exited normally
                    println!("[EZZO] PTY {} EOF", id);
                    break;
                }
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit(&event_name, data);
                }
                Err(e) if e.kind() == ErrorKind::WouldBlock => {
                    // Non-blocking mode: no data available yet, sleep briefly
                    // then retry (checking kill signal on next iteration)
                    std::thread::sleep(std::time::Duration::from_millis(10));
                    continue;
                }
                Err(e) => {
                    // Broken pipe / IO error → process is gone
                    println!("[EZZO] PTY {} read error: {}", id, e);
                    break;
                }
            }
        }

        println!("[EZZO] PTY {} reader finished", id);
        force_kill_child(&child_for_reader);
        ACTIVE_READERS.fetch_sub(1, std::sync::atomic::Ordering::SeqCst);
    });

    let session = PtySession {
        writer,
        kill_tx,
        master: pair.master,
        child: shared_child,
    };
    store.0.lock().unwrap().insert(id, session);
    println!("[EZZO] PTY {} spawned successfully", id);

    Ok(id)
}

#[tauri::command]
async fn write_pty(id: u32, data: String, store: tauri::State<'_, PtyStore>) -> Result<(), String> {
    let mut map = store.0.lock().unwrap();
    if let Some(session) = map.get_mut(&id) {
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        session.writer.flush().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn resize_pty(
    id: u32,
    cols: u16,
    rows: u16,
    store: tauri::State<'_, PtyStore>,
) -> Result<(), String> {
    let map = store.0.lock().unwrap();
    if let Some(session) = map.get(&id) {
        let size = PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        };
        let _ = session.master.resize(size);
    }
    Ok(())
}

#[tauri::command]
async fn kill_pty(id: u32, store: tauri::State<'_, PtyStore>) -> Result<(), String> {
    println!("[EZZO] Killing PTY {}", id);
    let entry = {
        let mut map = store.0.lock().unwrap();
        map.remove(&id)
    };
    if let Some(session) = entry {
        force_kill_child(&session.child);
        let _ = session.kill_tx.try_send(());
    }
    Ok(())
}

#[tauri::command]
fn read_clipboard() -> Result<String, String> {
    let mut cb = Clipboard::new().map_err(|e| format!("clipboard: {}", e))?;
    cb.get_text().map_err(|e| format!("clipboard read: {}", e))
}

#[tauri::command]
fn open_monitor_window(app: AppHandle) -> Result<(), String> {
    use tauri::WebviewWindowBuilder;
    // Check if a monitor window already exists
    if let Some(_existing) = app.get_webview_window("monitor") {
        // Focus the existing window instead of creating a new one
        let _ = _existing.set_focus();
        return Ok(());
    }
    let _window = WebviewWindowBuilder::new(
        &app,
        "monitor",
        tauri::WebviewUrl::App("index.html?monitor=true".into()),
    )
    .title("EZZO Monitor")
    .inner_size(600.0, 500.0)
    .min_inner_size(400.0, 300.0)
    .resizable(true)
    .decorations(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn close(app: AppHandle) {
    // Matar todos os PTYs antes de sair
    if let Some(state) = app.try_state::<PtyStore>() {
        let mut map = state.0.lock().unwrap();
        for (_, session) in map.drain() {
            force_kill_child(&session.child);
            let _ = session.kill_tx.try_send(());
        }
    }
    // Esperar que todos os threads de leitura terminem (máximo 5s)
    let mut waited = 0u32;
    while ACTIVE_READERS.load(std::sync::atomic::Ordering::SeqCst) > 0 && waited < 500 {
        std::thread::sleep(std::time::Duration::from_millis(10));
        waited += 1;
    }
    println!(
        "[EZZO] Fechando — {} readers activos restantes",
        ACTIVE_READERS.load(std::sync::atomic::Ordering::SeqCst)
    );
    app.exit(0);
}

#[tauri::command]
fn minimize(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.minimize();
    }
}

#[tauri::command]
fn maximize(app: AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_maximized().unwrap_or(false) {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

// ─── System Monitor ─────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
struct CpuInfo {
    name: String,
    usage: f32,
}

#[derive(Serialize, Clone)]
struct DiskInfo {
    name: String,
    mount: String,
    total_gb: f64,
    used_gb: f64,
    usage_pct: f64,
}

#[derive(Serialize, Clone)]
struct GpuInfo {
    name: String,
    usage_pct: f64,
    memory_used_mb: u64,
    memory_total_mb: u64,
    temperature: f64,
}

#[derive(Serialize)]
struct SystemInfo {
    cpu_cores: usize,
    cpu_usage_total: f32,
    cpus: Vec<CpuInfo>,
    ram_total_gb: f64,
    ram_used_gb: f64,
    ram_usage_pct: f64,
    swap_total_gb: f64,
    swap_used_gb: f64,
    swap_usage_pct: f64,
    disks: Vec<DiskInfo>,
    gpu: GpuInfo,
    uptime_secs: u64,
    process_count: usize,
    network_sent_mb: f64,
    network_recv_mb: f64,
}

#[tauri::command]
fn get_system_info(store: tauri::State<'_, SysInfoStore>) -> SystemInfo {
    let mut sys = store.0.lock().unwrap();
    sys.refresh_all();
    sys.refresh_cpu_all();

    let cpus: Vec<CpuInfo> = sys
        .cpus()
        .iter()
        .map(|c| CpuInfo {
            name: c.name().to_string(),
            usage: c.cpu_usage(),
        })
        .collect();

    let total_mem = sys.total_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let used_mem = sys.used_memory() as f64 / (1024.0 * 1024.0 * 1024.0);
    let total_swap = sys.total_swap() as f64 / (1024.0 * 1024.0 * 1024.0);
    let used_swap = sys.used_swap() as f64 / (1024.0 * 1024.0 * 1024.0);

    let disks_info = Disks::new_with_refreshed_list();
    let disks: Vec<DiskInfo> = disks_info
        .iter()
        .map(|d| {
            let total = d.total_space() as f64 / (1024.0 * 1024.0 * 1024.0);
            let available = d.available_space() as f64 / (1024.0 * 1024.0 * 1024.0);
            let used = total - available;
            DiskInfo {
                name: d.name().to_string_lossy().to_string(),
                mount: d.mount_point().to_string_lossy().to_string(),
                total_gb: (total * 100.0).round() / 100.0,
                used_gb: (used * 100.0).round() / 100.0,
                usage_pct: if total > 0.0 {
                    (used / total * 10000.0).round() / 100.0
                } else {
                    0.0
                },
            }
        })
        .collect();

    // GPU info — sysinfo 0.33 does not support GPU, return defaults
    let gpu_name = "N/A".to_string();

    let net_info = Networks::new_with_refreshed_list();
    let mut sent = 0u64;
    let mut recv = 0u64;
    for (_name, data) in net_info.iter() {
        sent += data.total_transmitted();
        recv += data.total_received();
    }

    SystemInfo {
        cpu_cores: sys.cpus().len(),
        cpu_usage_total: sys.global_cpu_usage(),
        cpus,
        ram_total_gb: (total_mem * 100.0).round() / 100.0,
        ram_used_gb: (used_mem * 100.0).round() / 100.0,
        ram_usage_pct: if total_mem > 0.0 {
            (used_mem / total_mem * 10000.0).round() / 100.0
        } else {
            0.0
        },
        swap_total_gb: (total_swap * 100.0).round() / 100.0,
        swap_used_gb: (used_swap * 100.0).round() / 100.0,
        swap_usage_pct: if total_swap > 0.0 {
            (used_swap / total_swap * 10000.0).round() / 100.0
        } else {
            0.0
        },
        disks,
        gpu: GpuInfo {
            name: gpu_name,
            usage_pct: 0.0,
            memory_used_mb: 0,
            memory_total_mb: 0,
            temperature: 0.0,
        },
        uptime_secs: System::uptime(),
        process_count: sys.processes().len(),
        network_sent_mb: (sent as f64 / (1024.0 * 1024.0) * 100.0).round() / 100.0,
        network_recv_mb: (recv as f64 / (1024.0 * 1024.0) * 100.0).round() / 100.0,
    }
}

struct SysInfoStore(Mutex<System>);

// ─── CLI Args ────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_cli_args() -> Vec<String> {
    std::env::args().collect()
}

// ─── Run ─────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(PtyStore::default())
        .manage(SysInfoStore(Mutex::new(System::new_all())))
        .invoke_handler(tauri::generate_handler![
            spawn_pty,
            write_pty,
            resize_pty,
            kill_pty,
            open_monitor_window,
            read_clipboard,
            close,
            minimize,
            maximize,
            get_cli_args,
            get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar o EZZO Terminal");
}
