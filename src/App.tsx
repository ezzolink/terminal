import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { WebglAddon } from "@xterm/addon-webgl";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "xterm/css/xterm.css";
import ezzoLogo from "./assets/logo-azul.png";

// ─── Lazy-loaded components (reduz bundle inicial) ─────────────────────────
const SystemMonitor = lazy(() => import("./SystemMonitor"));
const CommandPalette = lazy(() => import("./CommandPalette"));
const WelcomeScreen = lazy(() => import("./WelcomeScreen"));

// ─── SVG Icons ───────────────────────────────────────────────────────────────
// ─── Material Icons (Google Material Symbols) ────────────────────────────────
const IconClose = () => (
  <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <line x1="1" y1="1" x2="6" y2="6" />
    <line x1="6" y1="1" x2="1" y2="6" />
  </svg>
);
const IconMinimize = () => (
  <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <line x1="1" y1="5" x2="6" y2="5" />
  </svg>
);
const IconMaximize = () => (
  <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="0.8" y="0.8" width="5.4" height="5.4" rx="0.6" />
  </svg>
);
const IconPlus = () => <span className="material-symbols-outlined icon-md">add</span>;
const IconTabClose = () => <span className="material-symbols-outlined icon-xs">close</span>;
const IconShellCmd = () => <span className="material-symbols-outlined icon-sm">terminal</span>;
const IconShellPs = () => <span className="material-symbols-outlined icon-sm">powershell</span>;
const IconShellWsl = () => <span className="material-symbols-outlined icon-sm">penguin</span>;
const IconConnected = () => <span className="material-symbols-outlined icon-2xs">check_circle</span>;
const IconGear = () => <span className="material-symbols-outlined icon-md">settings</span>;

// NOTA: Ícones trocados intencionalmente.
// IconSplitH (ícone actual) representa DIVISÃO VERTICAL (duas janelas lado a lado)
// IconSplitV (ícone actual) representa DIVISÃO HORIZONTAL (duas janelas empilhadas)
// O utilizador pediu para trocar os ícones, mantendo as funcionalidades.
const IconSplitH = () => <span className="material-symbols-outlined icon-md">vertical_split</span>;
const IconSplitV = () => <span className="material-symbols-outlined icon-md">horizontal_split</span>;

const IconSnippet = () => <span className="material-symbols-outlined icon-md">code</span>;
const IconMonitor = () => <span className="material-symbols-outlined icon-md">monitoring</span>;

// ─── Types & Constants ───────────────────────────────────────────────────────
type ShellType = "powershell" | "cmd" | "wsl";

interface Settings {
  fontFamily: string;
  fontSize: number;
  background: "dark" | "light" | "transparent";
  theme: string;
}

interface Tab {
  id: string;
  title: string;
  shell: ShellType;
}

interface Snippet {
  id: string;
  name: string;
  command: string;
  category: string;
}

const FONT_OPTIONS = [
  { label: "JetBrains Mono", value: '"JetBrains Mono", monospace' },
  { label: "Cascadia Code", value: '"Cascadia Code", monospace' },
  { label: "Consolas", value: '"Consolas", monospace' },
  { label: "Fira Code", value: '"Fira Code", monospace' },
  { label: "Source Code Pro", value: '"Source Code Pro", monospace' },
  { label: "Ubuntu Mono", value: '"Ubuntu Mono", monospace' },
];

const THEME_OPTIONS = [
  { label: "EZZO", key: "ezzo" },
  { label: "Dracula", key: "dracula" },
  { label: "Monokai", key: "monokai" },
  { label: "Solarized", key: "solarized" },
  { label: "Nord", key: "nord" },
  { label: "Tokyo Night", key: "tokyonight" },
  { label: "Gruvbox", key: "gruvbox" },
  { label: "Catppuccin", key: "catppuccin" },
];

const BG_THEMES = {
  dark: { app: "#080810", terminal: "#06060c", label: "Escuro" },
  light: { app: "#f0f2f8", terminal: "#f0f2f8", label: "Claro" },
  transparent: { app: "rgba(8, 8, 16, 0.72)", terminal: "rgba(6, 6, 12, 0.85)", label: "Transparente" },
};

// ─── Terminal Themes (with REAL background colors, not transparent) ──────────
const TERM_THEMES: Record<string, { background: string; foreground: string; cursor: string; cursorAccent: string; selectionBackground: string;[key: string]: string }> = {
  ezzo: {
    background: "#0a0a14",
    foreground: "#dce6ff",
    cursor: "#3b82f6",
    cursorAccent: "#0a0a14",
    selectionBackground: "rgba(59,130,246,0.3)",
    black: "#0a0a12", red: "#f87171", green: "#4ade80", yellow: "#fbbf24",
    blue: "#60a5fa", magenta: "#c084fc", cyan: "#22d3ee", white: "#dce6ff",
    brightBlack: "#374151", brightRed: "#fca5a5", brightGreen: "#86efac", brightYellow: "#fde68a",
    brightBlue: "#93c5fd", brightMagenta: "#d8b4fe", brightCyan: "#67e8f9", brightWhite: "#f1f5f9",
  },
  dracula: {
    background: "#282a36",
    foreground: "#f8f8f2",
    cursor: "#f8f8f2",
    cursorAccent: "#282a36",
    selectionBackground: "rgba(68,71,90,0.5)",
    black: "#21222c", red: "#ff5555", green: "#50fa7b", yellow: "#f1fa8c",
    blue: "#bd93f9", magenta: "#ff79c6", cyan: "#8be9fd", white: "#f8f8f2",
    brightBlack: "#6272a4", brightRed: "#ff6e6e", brightGreen: "#69ff94", brightYellow: "#ffffa5",
    brightBlue: "#d6acff", brightMagenta: "#ff92df", brightCyan: "#a4ffff", brightWhite: "#ffffff",
  },
  monokai: {
    background: "#272822",
    foreground: "#f8f8f2",
    cursor: "#f8f8f0",
    cursorAccent: "#272822",
    selectionBackground: "rgba(73,72,62,0.5)",
    black: "#272822", red: "#f92672", green: "#a6e22e", yellow: "#f4bf75",
    blue: "#66d9ef", magenta: "#ae81ff", cyan: "#a1efe4", white: "#f8f8f2",
    brightBlack: "#75715e", brightRed: "#f92672", brightGreen: "#a6e22e", brightYellow: "#f4bf75",
    brightBlue: "#66d9ef", brightMagenta: "#ae81ff", brightCyan: "#a1efe4", brightWhite: "#f9f8f5",
  },
  solarized: {
    background: "#002b36",
    foreground: "#839496",
    cursor: "#839496",
    cursorAccent: "#002b36",
    selectionBackground: "rgba(7,54,66,0.5)",
    black: "#073642", red: "#dc322f", green: "#859900", yellow: "#b58900",
    blue: "#268bd2", magenta: "#d33682", cyan: "#2aa198", white: "#eee8d5",
    brightBlack: "#586e75", brightRed: "#cb4b16", brightGreen: "#586e75", brightYellow: "#657b83",
    brightBlue: "#839496", brightMagenta: "#6c71c4", brightCyan: "#93a1a1", brightWhite: "#fdf6e3",
  },
  nord: {
    background: "#2e3440",
    foreground: "#d8dee9",
    cursor: "#d8dee9",
    cursorAccent: "#2e3440",
    selectionBackground: "rgba(67,76,94,0.5)",
    black: "#3b4252", red: "#bf616a", green: "#a3be8c", yellow: "#ebcb8b",
    blue: "#81a1c1", magenta: "#b48ead", cyan: "#88c0d0", white: "#e5e9f0",
    brightBlack: "#4c566a", brightRed: "#bf616a", brightGreen: "#a3be8c", brightYellow: "#ebcb8b",
    brightBlue: "#81a1c1", brightMagenta: "#b48ead", brightCyan: "#8fbcbb", brightWhite: "#eceff4",
  },
  tokyonight: {
    background: "#1a1b26",
    foreground: "#c0caf5",
    cursor: "#c0caf5",
    cursorAccent: "#1a1b26",
    selectionBackground: "rgba(59,66,97,0.5)",
    black: "#15161e", red: "#f7768e", green: "#9ece6a", yellow: "#e0af68",
    blue: "#7aa2f7", magenta: "#bb9af7", cyan: "#7dcfff", white: "#a9b1d6",
    brightBlack: "#414868", brightRed: "#f7768e", brightGreen: "#9ece6a", brightYellow: "#e0af68",
    brightBlue: "#7aa2f7", brightMagenta: "#bb9af7", brightCyan: "#7dcfff", brightWhite: "#c0caf5",
  },
  gruvbox: {
    background: "#282828",
    foreground: "#ebdbb2",
    cursor: "#ebdbb2",
    cursorAccent: "#282828",
    selectionBackground: "rgba(80,73,69,0.5)",
    black: "#282828", red: "#cc241d", green: "#98971a", yellow: "#d79921",
    blue: "#458588", magenta: "#b16286", cyan: "#689d6a", white: "#a89984",
    brightBlack: "#928374", brightRed: "#fb4934", brightGreen: "#b8bb26", brightYellow: "#fabd2f",
    brightBlue: "#83a598", brightMagenta: "#d3869b", brightCyan: "#8ec07c", brightWhite: "#ebdbb2",
  },
  catppuccin: {
    background: "#1e1e2e",
    foreground: "#cdd6f4",
    cursor: "#f5e0dc",
    cursorAccent: "#1e1e2e",
    selectionBackground: "rgba(88,91,112,0.5)",
    black: "#45475a", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af",
    blue: "#89b4fa", magenta: "#f5c2e7", cyan: "#94e2d5", white: "#bac2de",
    brightBlack: "#585b70", brightRed: "#f38ba8", brightGreen: "#a6e3a1", brightYellow: "#f9e2af",
    brightBlue: "#89b4fa", brightMagenta: "#f5c2e7", brightCyan: "#94e2d5", brightWhite: "#a6adc8",
  },
};

const EMOJI_FONT = ', "Segoe UI Emoji", "Noto Color Emoji", "Apple Color Emoji", monospace';

const SHELL_OPTIONS: { value: ShellType; label: string; icon: typeof IconShellCmd }[] = [
  { value: "cmd", label: "CMD", icon: IconShellCmd },
  { value: "powershell", label: "PowerShell", icon: IconShellPs },
  { value: "wsl", label: "WSL", icon: IconShellWsl },
];

const DEFAULT_SNIPPETS: Snippet[] = [
  { id: "1", name: "Git Status", command: "git status", category: "Git" },
  { id: "2", name: "Git Log", command: "git log --oneline -10", category: "Git" },
  { id: "3", name: "Git Add All", command: "git add .", category: "Git" },
  { id: "4", name: "Git Push", command: "git push", category: "Git" },
  { id: "5", name: "Git Pull", command: "git pull", category: "Git" },
  { id: "6", name: "NPM Install", command: "npm install", category: "NPM" },
  { id: "7", name: "NPM Run Dev", command: "npm run dev", category: "NPM" },
  { id: "8", name: "NPM Run Build", command: "npm run build", category: "NPM" },
  { id: "9", name: "NPM Outdated", command: "npm outdated", category: "NPM" },
  { id: "10", name: "List Files", command: "dir", category: "System" },
  { id: "11", name: "Current Dir", command: "cd", category: "System" },
  { id: "12", name: "Clear Screen", command: "cls", category: "System" },
  { id: "13", name: "IP Config", command: "ipconfig", category: "Network" },
  { id: "14", name: "Ping Google", command: "ping 8.8.8.8", category: "Network" },
  { id: "15", name: "System Info", command: "systeminfo", category: "System" },
  { id: "16", name: "Docker PS", command: "docker ps", category: "Docker" },
  { id: "17", name: "Docker Images", command: "docker images", category: "Docker" },
  { id: "18", name: "Cargo Run", command: "cargo run", category: "Rust" },
  { id: "19", name: "Cargo Build", command: "cargo build --release", category: "Rust" },
  { id: "20", name: "Python Run", command: "python", category: "Python" },
];

// ─── Command Suggestions ─────────────────────────────────────────────────────
const KNOWN_COMMANDS = [
  "help", "clear", "cls", "dir", "ls", "cd", "mkdir", "rmdir", "del", "copy",
  "move", "ren", "type", "echo", "set", "exit", "ipconfig", "ping", "tracert",
  "netstat", "tasklist", "taskkill", "systeminfo", "whoami", "hostname",
  "shutdown", "restart", "chkdsk", "sfc", "diskpart", "format", "attrib",
  "find", "findstr", "sort", "more", "tree", "path", "prompt", "title",
  "color", "mode", "date", "time", "ver", "vol", "assoc", "ftype",
  "ezzo", "node", "npm", "npx", "git", "cargo", "rustc", "python", "pip",
  "docker", "curl", "wget", "ssh", "scp", "tar", "unzip", "zip",
];

function getCommandSuggestion(input: string): string | null {
  if (input.length < 2) return null;
  const lower = input.toLowerCase();
  const match = KNOWN_COMMANDS.find((cmd) => cmd.startsWith(lower) && cmd !== lower);
  return match ?? null;
}

// ─── Persistence ─────────────────────────────────────────────────────────────
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem("ezzo-terminal-settings");
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { fontFamily: '"JetBrains Mono", monospace', fontSize: 14, background: "dark", theme: "ezzo" };
}

function saveSettings(s: Settings) { localStorage.setItem("ezzo-terminal-settings", JSON.stringify(s)); }

function loadSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem("ezzo-terminal-snippets");
    if (raw) {
      const parsed: Snippet[] = JSON.parse(raw);
      // Garantir que todos os snippets têm categoria (migração de dados antigos)
      return parsed.map((s) => ({ ...s, category: s.category || "System" }));
    }
  } catch { /* ignore */ }
  return DEFAULT_SNIPPETS;
}

function saveSnippets(s: Snippet[]) { localStorage.setItem("ezzo-terminal-snippets", JSON.stringify(s)); }

// ─── Tab Persistence ──────────────────────────────────────────────────────────
// We persist shell + title only (PTY sessions are OS processes; we can't restore them,
// but we can recreate tabs with the same names so the user's layout is remembered).
interface PersistedTab { shell: ShellType; title: string; }

function loadPersistedTabs(): Tab[] {
  try {
    const raw = localStorage.getItem("ezzo-terminal-tabs");
    if (raw) {
      const parsed: PersistedTab[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => ({
          id: crypto.randomUUID(),
          shell: (["cmd", "powershell", "wsl"].includes(t.shell) ? t.shell : "cmd") as ShellType,
          title: t.title || "CMD 1",
        }));
      }
    }
  } catch { /* ignore */ }
  return [createTab("cmd", 1)];
}

function saveTabsToStorage(tabs: Tab[]) {
  try {
    const toSave: PersistedTab[] = tabs.map((t) => ({ shell: t.shell, title: t.title }));
    localStorage.setItem("ezzo-terminal-tabs", JSON.stringify(toSave));
  } catch { /* ignore */ }
}

// tabIndex is passed in so the name reflects the actual position, not a forever-growing counter
function createTab(shell: ShellType = "cmd", index: number = 1): Tab {
  return { id: crypto.randomUUID(), title: `${shell === "powershell" ? "PS" : shell === "wsl" ? "WSL" : "CMD"} ${index}`, shell };
}

// ─── PTY Store (Ref-based, survives hot-reload) ───────────────────────────────
interface PtyEntry {
  write: (data: string) => void;
  focus: () => void;
}

const ptyStoreRef = { current: new Map<string, PtyEntry>() };

function getPtyEntry(tabId: string): PtyEntry | undefined {
  return ptyStoreRef.current.get(tabId);
}

// ─── Terminal Pane ────────────────────────────────────────────────────────────
interface PaneProps {
  tab: Tab;
  active: boolean;
  settings: Settings;
}

function TerminalPane({ tab, active, settings }: PaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const ptyIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const inputBufferRef = useRef("");
  const suggestionRef = useRef("");
  // ─── Visible ghost-text state (mirrors suggestionRef for rendering) ────────────────
  const [suggestion, setSuggestion] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [ptyLoading, setPtyLoading] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const fullFont = settings.fontFamily.replace(/,\s*monospace\s*$/, "") + EMOJI_FONT;
    const theme = TERM_THEMES[settings.theme] || TERM_THEMES.ezzo;

    const isLight = settings.background === "light";
    const termTheme = { ...theme };
    if (isLight) {
      termTheme.foreground = "#1e293b";
      termTheme.cursorAccent = "#ffffff";
    }

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: settings.fontSize,
      fontFamily: fullFont,
      allowTransparency: false,
      scrollback: 10000,
      convertEol: false,  // Processamos \r manualmente no output listener para preservar progress bars e TUI
      drawBoldTextInBrightColors: true,
      theme: termTheme as any,
    });

    // ─── Hyperlinks clickáveis (URLs no output) ────────────────────────
    // xterm.js v5 suporta registerLinkMatcher em runtime (types ausentes, usamos cast)
    try {
      (term as any).registerLinkMatcher(
        /(https?:\/\/[^\s"<>'´`‖｜\[\]]+)/,
        (_event: MouseEvent, url: string) => {
          invoke("plugin:opener|open_url", { url }).catch(() => {
            window.open(url, "_blank", "noopener");
          });
        },
        {
          tooltipCallback: (_event: MouseEvent, url: string) => {
            termRef.current?.element?.setAttribute("title", `Abrir: ${url}`);
          },
          leaveCallback: () => {
            termRef.current?.element?.removeAttribute("title");
          },
          priority: 1,
        }
      );
    } catch (_) { /* fallback silencioso */ }

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    fitRef.current = fitAddon;
    searchRef.current = searchAddon;

    // ─── WebGL Renderer (com fallback Canvas) ─────────────────────────
    try {
      const webglAddon = new WebglAddon();
      term.loadAddon(webglAddon);
    } catch {
      // Fallback para renderer Canvas (nativo do xterm) — silencioso
    }

    // ─── Single key handler for ALL shortcuts (Ctrl+C/V/A/L/F + Tab) ───
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") return true;
      const ctrl = event.ctrlKey || event.metaKey;

      // Ctrl+C: copy selection if any, otherwise pass through (SIGINT)
      if (ctrl && event.key === "c") {
        const sel = term.getSelection();
        if (sel) { navigator.clipboard.writeText(sel); return false; }
        return true;
      }
      // Ctrl+V: intercept manually to prevent double-paste.
      // Uses native Rust clipboard reader (arboard) via Tauri command — much faster than navigator.clipboard.readText()
      if (ctrl && event.key === "v") {
        invoke<string>("read_clipboard").then((text) => {
          if (text && ptyIdRef.current !== null) {
            invoke("write_pty", { id: ptyIdRef.current, data: text }).catch(() => { });
          }
        }).catch(() => {
          // Fallback: try browser clipboard API
          navigator.clipboard.readText().then((text) => {
            if (text && ptyIdRef.current !== null) {
              invoke("write_pty", { id: ptyIdRef.current, data: text }).catch(() => { });
            }
          }).catch(() => {
            // Clipboard completely unavailable — user sees nothing pasted
          });
        });
        return false; // ← critical: blocks xterm.js from firing its own paste → no duplicate
      }
      // Ctrl+A: select all
      if (ctrl && event.key === "a") { term.selectAll(); return false; }
      // Ctrl+L: clear screen
      if (ctrl && event.key === "l") { term.clear(); return true; }
      // Ctrl+F: toggle search bar
      if (ctrl && event.key === "f") { setSearchVisible((v) => !v); return false; }
      // Ctrl+Shift+K: criar snippet a partir da seleção
      if (ctrl && event.shiftKey && event.key === "K") {
        const sel = term.getSelection();
        if (sel) {
          const name = sel.split(/\s+/).slice(0, 3).join(" ").substring(0, 40);
          const snippet: Snippet = { id: crypto.randomUUID(), name, command: sel, category: "Rápidos" };
          onAddSnippetRef.current?.(snippet);
          showSnippetsRef.current?.();
        }
        return false;
      }
      // Tab: accept command suggestion
      if (event.key === "Tab" && !ctrl && !event.altKey && !event.metaKey) {
        if (suggestionRef.current && inputBufferRef.current) {
          const remaining = suggestionRef.current.slice(inputBufferRef.current.length);
          if (remaining && ptyIdRef.current !== null) {
            invoke("write_pty", { id: ptyIdRef.current, data: remaining }).catch(() => { });
            inputBufferRef.current = suggestionRef.current;
            suggestionRef.current = "";
            setSuggestion(""); // clear ghost text
            return false;
          }
        }
      }
      return true;
    });

    term.open(containerRef.current);

    // ── Block native paste event to prevent xterm.js's built-in paste listener ──
    // Without this, xterm.js has TWO parallel paste paths:
    //   1) Our manual Ctrl+V in attachCustomKeyEventHandler → write_pty (correct)
    //   2) Native "paste" event → xterm's internal paste handler → onData → write_pty (DUPLICATE)
    // The capture-phase listener prevents the event from reaching xterm's textarea listener.
    const termContainer = containerRef.current;
    const preventPaste = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
    termContainer?.addEventListener("paste", preventPaste, true);

    setTimeout(() => { try { fitAddon.fit(); } catch (_) { /* hidden */ } }, 100);
    termRef.current = term;

    term.writeln(`\x1b[38;2;59;130;246m+-----------------------------------------------------+\x1b[0m`);
    term.writeln(`\x1b[38;2;59;130;246m|\x1b[0m  \x1b[1;38;2;96;165;250mEZZO Terminal\x1b[0m  \x1b[38;2;100;116;139mv1.5.0\x1b[0m`);
    term.writeln(`\x1b[38;2;59;130;246m|\x1b[0m  Shell: \x1b[38;2;34;211;238m${tab.shell === "powershell" ? "PowerShell" : tab.shell === "wsl" ? "WSL" : "CMD"}\x1b[0m`);
    term.writeln(`\x1b[38;2;59;130;246m|\x1b[0m  \x1b[38;2;100;116;139mCtrl+C/V/A/L/F | Split | Snippets | Search\x1b[0m`);
    term.writeln(`\x1b[38;2;59;130;246m+-----------------------------------------------------+\x1b[0m`);
    term.writeln("");


    // ── Register in PTY store for snippets + drag/drop ──
    ptyStoreRef.current.set(tab.id, {
      write: (data: string) => {
        if (ptyIdRef.current !== null) {
          invoke("write_pty", { id: ptyIdRef.current, data }).catch(() => { });
        }
      },
      focus: () => { term.focus(); },
    });

    const dims = fitAddon.proposeDimensions();

    // ── Use async IIFE so we can await listen() BEFORE registering onData ──
    // This prevents the race condition where PTY output (e.g. the shell prompt)
    // arrives before the Tauri event listener is subscribed and gets silently dropped.
    (async () => {
      try {
        const id = await invoke<number>("spawn_pty", {
          shell: tab.shell,
          cols: dims?.cols ?? 80,
          rows: dims?.rows ?? 24,
        });
        ptyIdRef.current = id;
        setPtyLoading(false);

        // ① Register the Tauri output listener FIRST — before onData — so we
        //    never miss the initial shell prompt that arrives immediately after spawn.
        const unlisten = await listen<string>(`pty_output_${id}`, (event) => {
          if (termRef.current) {
            // Converter \n sozinho (sem \r antes) para \r\n
            // Preserva \r sozinho (usado por progress bars e TUI update-in-place)
            // Preserva \r\n já existente
            const cleaned = event.payload.replace(/(?<!\r)\n/g, '\r\n');
            termRef.current.write(cleaned);
          }
        });
        unlistenRef.current = unlisten;

        // ② Now it's safe to register onData — the listener is fully active.
        term.onData((data) => {
          if (ptyIdRef.current !== null) {
            invoke("write_pty", { id: ptyIdRef.current, data }).catch(() => { });
          }
          // ── Buffer tracking for autocomplete suggestions ──────────────
          // Reset buffer on ENTER (command submitted)
          if (data === "\r" || data === "\n") {
            inputBufferRef.current = "";
            suggestionRef.current = "";
            setSuggestion("");
            return;
          }
          // Escape sequence detected (arrow keys, home, end, etc.) → reset buffer
          if (data.startsWith("\x1b")) {
            inputBufferRef.current = "";
            suggestionRef.current = "";
            setSuggestion("");
            return;
          }
          // Tab pressed → shell will auto-complete
          if (data === "\t") {
            suggestionRef.current = "";
            setSuggestion("");
            inputBufferRef.current = "";
            return;
          }
          // Backspace / Delete
          if (data === "\x7f" || data === "\b") {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          }
          // Ctrl+U (line kill) → clear entire buffer
          else if (data === "\x15") {
            inputBufferRef.current = "";
          }
          // Ctrl+W (delete word backward)
          else if (data === "\x17") {
            inputBufferRef.current = inputBufferRef.current.replace(/\s*\S+\s*$/, "");
          }
          // Printable character (single char, not control)
          else if (data.length === 1 && data >= " ") {
            inputBufferRef.current += data;
          }
          // Update suggestion based on clean buffer
          const newSuggestion = getCommandSuggestion(inputBufferRef.current) || "";
          suggestionRef.current = newSuggestion;
          setSuggestion(newSuggestion);
        });

      } catch (err) {
        setPtyLoading(false);
        // ── Simulated / fallback mode — PTY spawn failed ─────────────────
        term.writeln(`\x1b[31m╔═══════════════════════════════════════╗\x1b[0m`);
        term.writeln(`\x1b[31m║  EZZO: Falha ao iniciar shell real     ║\x1b[0m`);
        term.writeln(`\x1b[31m║  ${String(err).slice(0, 37).padEnd(37)} ║\x1b[0m`);
        term.writeln(`\x1b[31m╚═══════════════════════════════════════╝\x1b[0m`);
        term.writeln(`\x1b[33m[EZZO] Modo simulado activo — comandos não têm efeito real\x1b[0m`);
        term.writeln("");
        term.write(`C:\\Users\\ezzo> `);
        term.onData((data) => { term.write(data === "\r" ? "\r\n" : data); });
      }
    })();

    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !termRef.current) return;
      try {
        fitAddon.fit();
        const dims = fitAddon.proposeDimensions();
        if (dims && ptyIdRef.current !== null) invoke("resize_pty", { id: ptyIdRef.current, cols: dims.cols, rows: dims.rows }).catch(() => { });
      } catch (_) { /* hidden */ }
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      termContainer?.removeEventListener("paste", preventPaste, true);
      unlistenRef.current?.();
      ptyStoreRef.current.delete(tab.id);
      if (ptyIdRef.current !== null) invoke("kill_pty", { id: ptyIdRef.current }).catch(() => { });
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      searchRef.current = null;
      initializedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── React to settings changes (theme, font, size) ───
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    const fullFont = settings.fontFamily.replace(/,\s*monospace\s*$/, "") + EMOJI_FONT;
    const theme = TERM_THEMES[settings.theme] || TERM_THEMES.ezzo;
    const isLight = settings.background === "light";
    const termTheme: Record<string, string> = { ...theme };
    if (isLight) {
      termTheme.foreground = "#1e293b";
      termTheme.cursorAccent = "#ffffff";
    }

    // Apply theme changes
    term.options.theme = termTheme as any;
    term.options.fontFamily = fullFont;
    term.options.fontSize = settings.fontSize;

    // Re-fit after font/size change
    setTimeout(() => {
      try { fitRef.current?.fit(); } catch (_) { }
    }, 50);
  }, [settings.theme, settings.fontFamily, settings.fontSize, settings.background]);

  useEffect(() => {
    if (active && termRef.current) {
      setTimeout(() => { termRef.current?.focus(); try { fitRef.current?.fit(); } catch (_) { } }, 50);
    }
  }, [active]);

  const handleSearch = useCallback((text: string, next: boolean) => {
    if (!searchRef.current || !text) return;
    if (next) searchRef.current.findNext(text, {});
    else searchRef.current.findPrevious(text, {});
  }, []);

  useEffect(() => {
    if (searchVisible && searchInputRef.current) searchInputRef.current.focus();
  }, [searchVisible]);

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      {searchVisible && (
        <div className="search-bar">
          <input
            ref={searchInputRef}
            className="search-input"
            type="text"
            placeholder="Pesquisar no output..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(searchText, !e.shiftKey);
              if (e.key === "Escape") { setSearchVisible(false); setSearchText(""); }
            }}
          />
          <button className="search-btn" onClick={() => handleSearch(searchText, false)} title="Anterior">
            <span className="material-symbols-outlined icon-xs">keyboard_arrow_up</span>
          </button>
          <button className="search-btn" onClick={() => handleSearch(searchText, true)} title="Proximo">
            <span className="material-symbols-outlined icon-xs">keyboard_arrow_down</span>
          </button>
          <button className="search-btn search-close" onClick={() => { setSearchVisible(false); setSearchText(""); }} title="Fechar">
            <IconTabClose />
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className="terminal-container"
        style={{ flex: 1, width: "100%" }}
        onMouseDown={() => { if (termRef.current) termRef.current.focus(); }}
      >
        {ptyLoading && (
          <div className="terminal-loading-overlay">
            <div className="terminal-loading-spinner" />
            <span className="terminal-loading-text">A iniciar shell...</span>
          </div>
        )}
      </div>
      {/* ─── Ghost Text Hint Bar ────────────────────────────────────────────────── */}
      {suggestion && inputBufferRef.current && (
        <div className="suggestion-bar">
          <span className="suggestion-typed">{inputBufferRef.current}</span>
          <span className="suggestion-ghost">{suggestion.slice(inputBufferRef.current.length)}</span>
          <span className="suggestion-hint">⇥ Tab para completar</span>
        </div>
      )}
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────────────────────
interface SettingsPanelProps { settings: Settings; onChange: (s: Settings) => void; onClose: () => void; }

function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={panelRef} className="settings-panel">
      <div className="settings-header">
        <span className="settings-title">Definicoes</span>
        <button className="settings-close" onClick={onClose} title="Fechar definicoes"><IconTabClose /></button>
      </div>
      <div className="settings-section">
        <label className="settings-label">Tipo de Letra</label>
        <select className="settings-select" value={settings.fontFamily} onChange={(e) => onChange({ ...settings, fontFamily: e.target.value })} title="Tipo de letra">
          {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>
      <div className="settings-section">
        <label className="settings-label">Tamanho da Letra: {settings.fontSize}px</label>
        <input type="range" className="settings-range" min={10} max={24} step={1} value={settings.fontSize} onChange={(e) => onChange({ ...settings, fontSize: parseInt(e.target.value) })} title="Tamanho da letra" aria-label="Tamanho da letra" />
      </div>
      <div className="settings-section">
        <label className="settings-label">Tema de Cores</label>
        <select className="settings-select" value={settings.theme} onChange={(e) => onChange({ ...settings, theme: e.target.value })} title="Tema de cores">
          {THEME_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>
      <div className="settings-section">
        <label className="settings-label">Fundo</label>
        <div className="settings-bg-options">
          {(Object.keys(BG_THEMES) as Array<keyof typeof BG_THEMES>).map((key) => (
            <button key={key} className={`settings-bg-btn ${settings.background === key ? "active" : ""}`} onClick={() => onChange({ ...settings, background: key })}>
              {BG_THEMES[key].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Snippets Panel ──────────────────────────────────────────────────────────
interface SnippetsPanelProps { onRun: (cmd: string) => void; onClose: () => void; snippets: Snippet[]; onAddSnippet: (s: Snippet) => void; }

function SnippetsPanel({ onRun, onClose, snippets, onAddSnippet }: SnippetsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCmd, setNewCmd] = useState("");
  const [newCat, setNewCat] = useState("System");

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const categories = [...new Set(snippets.map((s) => s.category))];

  const handleAdd = () => {
    if (!newName || !newCmd) return;
    const cat = newCat.trim() || "System";
    onAddSnippet({ id: crypto.randomUUID(), name: newName, command: newCmd, category: cat });
    setNewName(""); setNewCmd(""); setNewCat("System"); setAdding(false);
  };

  return (
    <div ref={panelRef} className="snippets-panel">
      <div className="settings-header">
        <span className="settings-title">Snippets</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="settings-close" onClick={() => setAdding(!adding)} title={adding ? "Cancelar" : "Adicionar snippet"} style={{ color: adding ? "#3b82f6" : undefined }}>
            <IconPlus />
          </button>
          <button className="settings-close" onClick={onClose} title="Fechar snippets"><IconTabClose /></button>
        </div>
      </div>
      {adding && (
        <div className="settings-section" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <input className="snippet-input" placeholder="Nome..." value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className="snippet-input" placeholder="Comando..." value={newCmd} onChange={(e) => setNewCmd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} />
          <input className="snippet-input" placeholder="Categoria..." value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ width: "40%" }} list="category-suggestions" />
          <datalist id="category-suggestions">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
          <button className="snippet-add-btn" onClick={handleAdd}>Adicionar</button>
        </div>
      )}
      {categories.map((cat) => (
        <div key={cat} className="snippet-category">
          <div className="snippet-cat-label">{cat}</div>
          {snippets.filter((s) => s.category === cat).map((s) => (
            <button key={s.id} className="snippet-item" onClick={() => { onRun(s.command); onClose(); }}>
              <span className="snippet-name">{s.name}</span>
              <span className="snippet-cmd">{s.command}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Command id counter (useRef no App para evitar estado global mutável) ──
const cmdIdCounterRef = { current: 0 };
function cmdId(counterRef: { current: number }): string { return `cmd-${++counterRef.current}`; }

// ─── Refs globais (acedidos pelo TerminalPane via atalhos) ─────────────
const onAddSnippetRef: { current: ((s: Snippet) => void) | null } = { current: null };
const showSnippetsRef: { current: (() => void) | null } = { current: null };

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  // ─── Monitor standalone mode (opened via open_monitor_window) ──────────
  const [isMonitorStandalone, setIsMonitorStandalone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("monitor") === "true") {
      setIsMonitorStandalone(true);
    }
  }, []);

  if (isMonitorStandalone) {
    return (
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "rgba(8, 8, 16, 0.95)" }}>
        <Suspense fallback={<div style={{ color: "rgba(148,163,184,0.5)", textAlign: "center", paddingTop: "40vh", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>A iniciar monitor...</div>}>
          <SystemMonitor onClose={() => { invoke("close").catch(() => { }); }} standalone={true} />
        </Suspense>
      </div>
    );
  }
  // Initialize tabs from localStorage (shell type + title are persisted)
  const [tabs, setTabs] = useState<Tab[]>(loadPersistedTabs);
  const [activeId, setActiveId] = useState<string>(() => tabs[0].id);
  const [defaultShell, setDefaultShell] = useState<ShellType>("cmd");
  const [clock, setClock] = useState("");
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem("ezzo-welcome-dismissed"));
  const [snippets, setSnippets] = useState<Snippet[]>(loadSnippets);
  const [splitMode, setSplitMode] = useState<"none" | "horizontal" | "vertical">("none");
  const [secondTabId, setSecondTabId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // ─── Split pane sizes (fraction 0-1 for the left/top pane) ─────────────────
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitDragRef = useRef<{ startX: number; startY: number; startRatio: number }>({ startX: 0, startY: 0, startRatio: 0.5 });
  // ─── Tab rename state ────────────────────────────────────────────────────────
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  // ─── Focused pane tracking (which terminal receives snippets / drag-drop) ───
  // In split mode there are two live terminals; focusedTabId tells us which one
  // the user last interacted with so snippets go to the right place.
  const [focusedTabId, setFocusedTabId] = useState<string>(() => tabs[0].id);
  const focusedTabIdRef = useRef(focusedTabId);
  focusedTabIdRef.current = focusedTabId;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const bgTheme = BG_THEMES[settings.background];

  const handleSettingsChange = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    // Ativar transparência nativa via Tauri window.setEffects
    try {
      const win = getCurrentWebviewWindow();
      if (newSettings.background === "transparent") {
        (win as any).setEffects({ effects: ["blur"] });
      } else {
        (win as any).setEffects({ effects: [] });
      }
    } catch (_) { }
  }, []);

  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Persist tabs to localStorage whenever they change ──────────────────────
  useEffect(() => { saveTabsToStorage(tabs); }, [tabs]);

  const addTab = useCallback(() => {
    setTabs((prev) => {
      const t = createTab(defaultShell, prev.length + 1);
      setActiveId(t.id);
      return [...prev, t];
    });
  }, [defaultShell]);

  const closeTab = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingTabId(null); // cancel any active rename
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (next.length === 0) {
        const fresh = createTab(defaultShell, 1);
        setActiveId(fresh.id);
        return [fresh];
      }
      if (activeId === id) setActiveId(next[next.length - 1].id);
      if (secondTabId === id) { setSecondTabId(null); setSplitMode("none"); }
      return next;
    });
  }, [activeId, defaultShell, secondTabId]);

  // ─── Rename helpers ─────────────────────────────────────────────────────────
  const startRename = useCallback((tab: Tab, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingTabId(tab.id);
    setRenameValue(tab.title);
    // Focus the input on next tick (it's not mounted yet)
    setTimeout(() => renameInputRef.current?.select(), 30);
  }, []);

  const commitRename = useCallback(() => {
    if (!renamingTabId) return;
    const trimmed = renameValue.trim();
    if (trimmed) {
      setTabs((prev) => prev.map((t) => t.id === renamingTabId ? { ...t, title: trimmed } : t));
    }
    setRenamingTabId(null);
  }, [renamingTabId, renameValue]);

  const cancelRename = useCallback(() => {
    setRenamingTabId(null);
    setRenameValue("");
  }, []);

  const handleWindowButton = (action: "close" | "minimize" | "maximize") => { invoke(action).catch(() => { }); };

  const runSnippet = useCallback((cmd: string) => {
    // Send to whichever pane the user last focused — in split mode this can be
    // either the left (activeId) or right (secondTabId) pane.
    const targetId = focusedTabId || activeId;
    const entry = getPtyEntry(targetId);
    if (entry) {
      entry.write(cmd + "\r");
      entry.focus();
    }
  }, [focusedTabId, activeId]);

  const addSnippet = useCallback((s: Snippet) => {
    setSnippets((prev) => {
      const next = [...prev, s];
      saveSnippets(next);
      return next;
    });
  }, []);

  // Ligar refs globais para atalhos no TerminalPane (Ctrl+Shift+K)
  useEffect(() => {
    onAddSnippetRef.current = addSnippet;
    showSnippetsRef.current = () => setShowSnippets(true);
    return () => {
      onAddSnippetRef.current = null;
      showSnippetsRef.current = null;
    };
  }, [addSnippet]);

  // ─── CLI Args: open .bat file passed via "Open With" (executar só uma vez no arranque) ───
  useEffect(() => {
    invoke<string[]>("get_cli_args").then((args) => {
      const fileArg = args.find((a) => !a.startsWith("-") && /\.(bat|cmd|ps1|sh)$/i.test(a));
      if (fileArg) {
        setTimeout(() => {
          // Use the focused pane (fallback to activeId)
          const entry = getPtyEntry(focusedTabIdRef.current || activeIdRef.current);
          if (entry) {
            const ext = fileArg.split(".").pop()?.toLowerCase();
            const cmd = (ext === "bat" || ext === "cmd") ? `call "${fileArg}"` : `& "${fileArg}"`;
            entry.write(cmd + "\r");
          }
        }, 1500);
      }
    }).catch(() => { });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drag & Drop — usa a API nativa do Tauri v2 para obter caminhos reais
  useEffect(() => {
    const unlisten = getCurrentWindow().onDragDropEvent((event) => {
      if (event.payload.type === "enter" || event.payload.type === "over") {
        setDragOver(true);
      } else if (event.payload.type === "drop") {
        setDragOver(false);
        const paths = (event.payload as { type: "drop"; paths: string[] }).paths;
        if (paths && paths.length > 0) {
          const cmd = paths.map((p) => (p.includes(" ") ? `"${p}"` : p)).join(" ");
          // Drop goes to the focused pane (the one the user last clicked)
          const entry = getPtyEntry(focusedTabIdRef.current || activeIdRef.current);
          if (entry) {
            entry.write(cmd);
            entry.focus();
          }
        }
      } else {
        setDragOver(false);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Toggle split mode — ALWAYS creates a new tab for the second pane
  // This prevents existing terminals from being dismounted and losing their PTY session
  const toggleSplit = useCallback((mode: "horizontal" | "vertical") => {
    setSplitMode((prev) => {
      if (prev === mode) {
        // Disable split — clean up second pane tab
        if (secondTabId) {
          setTabs((currentTabs) => currentTabs.filter((t) => t.id !== secondTabId));
        }
        setSecondTabId(null);
        return "none";
      }
      // Enable split — always create a fresh tab for pane 2
      const newTab = createTab(defaultShell);
      setSecondTabId(newTab.id);
      setTabs((currentTabs) => [...currentTabs, newTab]);
      return mode;
    });
  }, [defaultShell, secondTabId]);

  // ─── Build command palette items ──────────────────────────────────────────
  const commandPaletteItems = useCallback(() => [
    { id: cmdId(cmdIdCounterRef), category: "Geral", label: "Paleta de Comandos", shortcut: "Ctrl+Shift+P", icon: "search", action: () => setShowCommandPalette(true) },
    { id: cmdId(cmdIdCounterRef), category: "Geral", label: "Definições", shortcut: "Ctrl+,", icon: "settings", action: () => { setShowSettings((v) => !v); } },
    { id: cmdId(cmdIdCounterRef), category: "Geral", label: "Snippets", shortcut: "Ctrl+Shift+S", icon: "snippet", action: () => { setShowSnippets((v) => !v); } },
    { id: cmdId(cmdIdCounterRef), category: "Geral", label: "Monitor do Sistema", icon: "monitor", action: () => { setShowMonitor((v) => !v); } },
    { id: cmdId(cmdIdCounterRef), category: "Geral", label: "Abrir Monitor em Janela Separada", icon: "monitor", action: () => { invoke("open_monitor_window"); } },
    { id: cmdId(cmdIdCounterRef), category: "Painéis", label: "Split Vertical", shortcut: "Ctrl+Shift+D", icon: "split", action: () => toggleSplit("vertical") },
    { id: cmdId(cmdIdCounterRef), category: "Painéis", label: "Split Horizontal", shortcut: "Ctrl+Shift+H", icon: "split", action: () => toggleSplit("horizontal") },
    { id: cmdId(cmdIdCounterRef), category: "Abas", label: "Nova Aba", shortcut: "Ctrl+Shift+N", icon: "tab", action: () => addTab() },
    { id: cmdId(cmdIdCounterRef), category: "Abas", label: "Fechar Aba Actual", icon: "tab", action: () => { const t = tabs.find(t => t.id === activeId); if (t) { const evt = { stopPropagation: () => { } } as React.MouseEvent; closeTab(t.id, evt); } } },
    { id: cmdId(cmdIdCounterRef), category: "Ferramentas", label: "Pesquisar no Terminal", shortcut: "Ctrl+F", icon: "search", action: () => { /* busca interna Ctrl+F */ } },
    { id: cmdId(cmdIdCounterRef), category: "Janela", label: "Fechar Janela", icon: "window", action: () => invoke("close").catch(() => { }) },
    { id: cmdId(cmdIdCounterRef), category: "Janela", label: "Minimizar", icon: "window", action: () => invoke("minimize").catch(() => { }) },
    { id: cmdId(cmdIdCounterRef), category: "Janela", label: "Maximizar", icon: "window", action: () => invoke("maximize").catch(() => { }) },
    { id: cmdId(cmdIdCounterRef), category: "Ajuda", label: "Atalhos de Teclado", icon: "help", action: () => { setShowCommandPalette(true); } },
  ], [toggleSplit, addTab, activeId, tabs, closeTab]);

  // Keyboard shortcuts at app level
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.shiftKey && e.key === "D") { e.preventDefault(); toggleSplit("vertical"); }
      if (ctrl && e.shiftKey && e.key === "H") { e.preventDefault(); toggleSplit("horizontal"); }
      if (ctrl && e.shiftKey && e.key === "S") { e.preventDefault(); setShowSnippets((v) => !v); }
      if (ctrl && e.shiftKey && e.key === "N") { e.preventDefault(); addTab(); }
      if (ctrl && e.shiftKey && e.key === "P") { e.preventDefault(); setShowCommandPalette(true); }
      if (ctrl && e.key === ",") { e.preventDefault(); setShowSettings((v) => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addTab, toggleSplit]);

  const activeTab = tabs.find((t) => t.id === activeId);
  const secondTab = secondTabId ? tabs.find((t) => t.id === secondTabId) : undefined;

  return (
    <div className={`terminal-app${settings.background === "light" ? " theme-light" : ""}${settings.background === "transparent" ? " theme-transparent" : ""}`} style={{ background: bgTheme.app }}>
      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-text">Soltar ficheiro aqui</div>
        </div>
      )}

      <div className="title-bar">
        <div className="title-bar-buttons">
          <button className="tb-btn close" onClick={() => handleWindowButton("close")} title="Fechar"><IconClose /></button>
          <button className="tb-btn minimize" onClick={() => handleWindowButton("minimize")} title="Minimizar"><IconMinimize /></button>
          <button className="tb-btn maximize" onClick={() => handleWindowButton("maximize")} title="Maximizar"><IconMaximize /></button>
        </div>
        <img src={ezzoLogo} alt="EZZO" className="title-bar-logo-img" />
        <div className="title-bar-right">
          <button className="title-bar-btn" onClick={() => toggleSplit("vertical")} title="Split Vertical (Ctrl+Shift+D)" style={splitMode === "vertical" ? { color: "#3b82f6" } : undefined}><IconSplitV /></button>
          <button className="title-bar-btn" onClick={() => toggleSplit("horizontal")} title="Split Horizontal (Ctrl+Shift+H)" style={splitMode === "horizontal" ? { color: "#3b82f6" } : undefined}><IconSplitH /></button>
          <button className="title-bar-btn" onClick={() => setShowSnippets(!showSnippets)} title="Snippets (Ctrl+Shift+S)" style={showSnippets ? { color: "#3b82f6" } : undefined}><IconSnippet /></button>
          <button className="title-bar-btn" onClick={() => setShowMonitor(!showMonitor)} title="Monitor do Sistema" style={showMonitor ? { color: "#22c55e" } : undefined}><IconMonitor /></button>
          <button className="title-bar-btn" onClick={() => setShowSettings(!showSettings)} title="Definicoes (Ctrl+,)"><IconGear /></button>
        </div>
      </div>

      <div className="tabs-bar">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          const isRenaming = renamingTabId === tab.id;
          const isInLeftPane = tab.id === activeId;
          const isInRightPane = tab.id === secondTabId;
          return (
            <div
              key={tab.id}
              className={`tab${isActive ? " active" : ""}${isInRightPane ? " tab-split-right" : ""}${isInLeftPane ? " tab-split-left" : ""}`}
              onClick={() => { if (!isRenaming) setActiveId(tab.id); }}
              onDoubleClick={(e) => startRename(tab, e)}
              title={`${tab.title}${isInLeftPane ? " · Painel Esquerdo" : ""}${isInRightPane ? " · Painel Direito" : ""}\n(Duplo clique para renomear)`}
            >
              <span className="tab-shell-icon">
                {tab.shell === "powershell" ? <IconShellPs /> : tab.shell === "wsl" ? <IconShellWsl /> : <IconShellCmd />}
              </span>
              {isRenaming ? (
                <input
                  ref={renameInputRef}
                  className="tab-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitRename(); }
                    if (e.key === "Escape") { e.preventDefault(); cancelRename(); }
                    e.stopPropagation(); // don't let tab shortcuts fire while typing
                  }}
                  onBlur={commitRename}
                  onClick={(e) => e.stopPropagation()}
                  maxLength={32}
                  aria-label="Renomear aba"
                />
              ) : (
                <span className="tab-title-text">{tab.title}</span>
              )}
              {/* Split position badges */}
              {isInRightPane && <span className="tab-badge tab-badge-right" title="Painel Direito/Baixo">2</span>}
              {isInLeftPane && <span className="tab-badge tab-badge-left" title="Painel Esquerdo/Cima">1</span>}
              {tabs.length > 1 && !isRenaming && (
                <button className="tab-close" onClick={(e) => closeTab(tab.id, e)} title="Fechar aba"><IconTabClose /></button>
              )}
            </div>
          );
        })}
        <div className="tabs-spacer" />
        <select className="shell-selector" value={activeTab?.shell || defaultShell} onChange={(e) => setDefaultShell(e.target.value as ShellType)} title={activeTab ? `Shell actual: ${activeTab.shell.toUpperCase()}` : "Shell padrao"}>
          {SHELL_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="tab-add-btn" onClick={addTab} title="Nova aba (Ctrl+Shift+N)"><IconPlus /></button>
      </div>

      {/* ─── Split divider drag handler ──────────────────────────────────── */}
      {isDraggingSplit && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 999, cursor: splitMode === "horizontal" ? "row-resize" : "col-resize",
          }}
          onMouseMove={(e) => {
            if (!splitDragRef.current) return;
            const rect = document.getElementById("terminal-main-area")?.getBoundingClientRect();
            if (!rect) return;
            const delta = splitMode === "horizontal"
              ? e.clientY - splitDragRef.current.startY
              : e.clientX - splitDragRef.current.startX;
            const total = splitMode === "horizontal" ? rect.height : rect.width;
            const ratioDelta = delta / total;
            setSplitRatio(Math.max(0.15, Math.min(0.85, splitDragRef.current.startRatio + ratioDelta)));
          }}
          onMouseUp={() => setIsDraggingSplit(false)}
          onMouseLeave={() => setIsDraggingSplit(false)}
        />
      )}

      <div id="terminal-main-area" style={{ flex: 1, display: "flex", flexDirection: splitMode === "horizontal" ? "column" : "row", overflow: "hidden", position: "relative" }}>
        {/* Main (Left/Top) pane */}
        <div
          style={{ flex: splitMode === "none" ? 1 : `0 0 ${splitRatio * 100}%`, position: "relative", overflow: "hidden", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}
          onMouseDown={() => setFocusedTabId(activeId)}
        >
          {/* Pane header — only visible in split mode */}
          {splitMode !== "none" && (
            <div className={`pane-header pane-header-left${focusedTabId === activeId ? " pane-focused" : ""}`}>
              <span className="pane-header-label"><span className="pane-dot" />Painel 1</span>
              <select
                className="pane-tab-selector"
                value={activeId}
                onChange={(e) => { setActiveId(e.target.value); setFocusedTabId(e.target.value); }}
                title="Escolher aba para este painel"
              >
                {tabs.filter((t) => t.id !== secondTabId).map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {tabs.filter((tab) => splitMode === "none" || tab.id !== secondTabId).map((tab) => (
              <div key={tab.id} style={{ position: "absolute", inset: 0, zIndex: tab.id === activeId ? 1 : -1, opacity: tab.id === activeId ? 1 : 0, pointerEvents: tab.id === activeId ? "auto" : "none" }}>
                <TerminalPane tab={tab} active={tab.id === activeId} settings={settings} />
              </div>
            ))}
          </div>
        </div>

        {/* Split pane (Right/Bottom) */}
        {splitMode !== "none" && secondTab && (
          <>
            <div
              className={splitMode === "horizontal" ? "split-divider-h" : "split-divider-v"}
              onMouseDown={(e) => {
                e.preventDefault();
                splitDragRef.current = { startX: e.clientX, startY: e.clientY, startRatio: splitRatio };
                setIsDraggingSplit(true);
              }}
            />
            <div
              style={{ flex: `0 0 ${(1 - splitRatio) * 100}%`, position: "relative", overflow: "hidden", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}
              onMouseDown={() => { if (secondTabId) setFocusedTabId(secondTabId); }}
            >
              {/* Pane header with tab selector */}
              <div className={`pane-header pane-header-right${focusedTabId === secondTabId ? " pane-focused" : ""}`}>
                <span className="pane-header-label"><span className="pane-dot" />Painel 2</span>
                <select
                  className="pane-tab-selector"
                  value={secondTabId ?? ""}
                  onChange={(e) => { setSecondTabId(e.target.value); setFocusedTabId(e.target.value); }}
                  title="Escolher aba para este painel"
                >
                  {tabs.filter((t) => t.id !== activeId).map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <TerminalPane tab={secondTab} active={true} settings={settings} />
              </div>
            </div>
          </>
        )}


        {showSettings && <SettingsPanel settings={settings} onChange={handleSettingsChange} onClose={() => setShowSettings(false)} />}
        {showWelcome && (
          <Suspense fallback={null}>
            <WelcomeScreen onDismiss={() => { localStorage.setItem("ezzo-welcome-dismissed", "1"); setShowWelcome(false); }} />
          </Suspense>
        )}
        {showSnippets && <SnippetsPanel onRun={runSnippet} onClose={() => setShowSnippets(false)} snippets={snippets} onAddSnippet={addSnippet} />}
        {showMonitor && (
          <Suspense fallback={null}>
            <SystemMonitor onClose={() => setShowMonitor(false)} />
          </Suspense>
        )}
        {showCommandPalette && (
          <Suspense fallback={null}>
            <CommandPalette commands={commandPaletteItems()} onClose={() => setShowCommandPalette(false)} />
          </Suspense>
        )}
      </div>

      <div className="status-bar">
        <div className="status-left">
          <span className="status-item"><IconConnected /> Conectado</span>
          {/* Shell: in split mode show both panes, otherwise show focused tab */}
          {splitMode !== "none" ? (
            <>
              <span className="status-item status-shell-left" title="Painel 1">
                {SHELL_OPTIONS.find((s) => s.value === (activeTab?.shell || "cmd"))?.label || "CMD"}
              </span>
              <span style={{ opacity: 0.3, fontSize: 10 }}>│</span>
              <span className="status-item status-shell-right" title="Painel 2">
                {SHELL_OPTIONS.find((s) => s.value === (secondTab?.shell || "cmd"))?.label || "CMD"}
              </span>
            </>
          ) : (
            <span className="status-item">
              {SHELL_OPTIONS.find((s) => s.value === (tabs.find(t => t.id === focusedTabId)?.shell || activeTab?.shell || "cmd"))?.label || "CMD"}
            </span>
          )}
          <span className="status-item" style={{ opacity: 0.5 }}>
            {FONT_OPTIONS.find((f) => f.value === settings.fontFamily)?.label} {settings.fontSize}px
          </span>
          <span className="status-item" style={{ opacity: 0.5 }}>
            {THEME_OPTIONS.find((t) => t.key === settings.theme)?.label}
          </span>
        </div>
        <div className="status-right">
          {splitMode !== "none" && <span className="status-item status-split-badge">Split {splitMode === "vertical" ? "Vertical" : "Horizontal"}</span>}
          <span className="status-item">{tabs.length} {tabs.length === 1 ? "aba" : "abas"}</span>
          <span className="status-item">{clock}</span>
        </div>
      </div>
    </div>
  );
}
