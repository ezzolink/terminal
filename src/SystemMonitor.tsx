import { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

// ─── Types ───────────────────────────────────────────────────────────────────
interface CpuInfo { name: string; usage: number }
interface DiskInfo { name: string; mount: string; total_gb: number; used_gb: number; usage_pct: number }
interface GpuInfo { name: string; usage_pct: number; memory_used_mb: number; memory_total_mb: number; temperature: number }

interface SystemInfo {
  cpu_cores: number;
  cpu_usage_total: number;
  cpus: CpuInfo[];
  ram_total_gb: number;
  ram_used_gb: number;
  ram_usage_pct: number;
  swap_total_gb: number;
  swap_used_gb: number;
  swap_usage_pct: number;
  disks: DiskInfo[];
  gpu: GpuInfo;
  uptime_secs: number;
  process_count: number;
  network_sent_mb: number;
  network_recv_mb: number;
}

// ─── Chart Component ─────────────────────────────────────────────────────────
interface MiniChartProps {
  data: number[];
  color: string;
  height?: number;
  maxVal?: number;
  label: string;
  value: string;
  sub?: string;
}

function MiniChart({ data, color, height = 60, maxVal = 100, label, value, sub }: MiniChartProps) {
  const w = 180;
  const h = height;
  const pts = data.length;
  if (pts < 2) return null;

  const points = data.map((v, i) => {
    const x = (i / (pts - 1)) * w;
    const y = h - (Math.min(v, maxVal) / maxVal) * (h - 4);
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <div className="monitor-chart">
      <div className="monitor-chart-header">
        <span className="monitor-chart-label">{label}</span>
        <span className="monitor-chart-value" style={{ color }}>{value}</span>
      </div>
      {sub && <div className="monitor-chart-sub">{sub}</div>}
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id={`grad-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${label.replace(/\s/g, "")})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ─── Ring Gauge ──────────────────────────────────────────────────────────────
function RingGauge({ value, size = 56, color, label }: { value: number; size?: number; color: string; label: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(value, 100) / 100);

  return (
    <div className="monitor-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="11" fontWeight="600">
          {Math.round(value)}%
        </text>
      </svg>
      <span className="monitor-ring-label">{label}</span>
    </div>
  );
}

// ─── System Monitor Panel ────────────────────────────────────────────────────
interface MonitorProps {
  onClose: () => void;
  standalone?: boolean;
}

const HISTORY_LEN = 60;

export default function SystemMonitor({ onClose, standalone }: MonitorProps) {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [ramHistory, setRamHistory] = useState<number[]>([]);
  const [gpuHistory, setGpuHistory] = useState<number[]>([]);
  const [netHistory, setNetHistory] = useState<number[]>([]);
  const [pos, setPos] = useState({ x: 60, y: 60 });
  const [dragging, setDragging] = useState(false);
  const isStandalone = standalone === true;
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const prevNetSent = useRef(0);
  const prevNetRecv = useRef(0);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".monitor-close-btn")) return;
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  // Poll system info
  useEffect(() => {
    const poll = async () => {
      try {
        const data = await invoke<SystemInfo>("get_system_info");
        setInfo(data);
        setCpuHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), data.cpu_usage_total]);
        setRamHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), data.ram_usage_pct]);
        setGpuHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), data.gpu.usage_pct]);

        // Network speed (MB/s delta)
        if (prevNetSent.current > 0) {
          const delta = (data.network_sent_mb + data.network_recv_mb) - (prevNetSent.current + prevNetRecv.current);
          setNetHistory((prev) => [...prev.slice(-(HISTORY_LEN - 1)), Math.max(0, delta)]);
        }
        prevNetSent.current = data.network_sent_mb;
        prevNetRecv.current = data.network_recv_mb;
      } catch { /* ignore */ }
    };
    poll();
    const t = setInterval(poll, 1000);
    return () => clearInterval(t);
  }, []);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (!info) return null;

  return (
    <div
      ref={panelRef}
      className="system-monitor"
      style={{ left: pos.x, top: pos.y, cursor: dragging ? "grabbing" : "grab" }}
      onMouseDown={onMouseDown}
    >
      {/* Header */}
      <div className="monitor-header">
        <div className="monitor-header-left">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1" y="1" width="12" height="12" rx="2" />
            <line x1="1" y1="5" x2="13" y2="5" />
            <line x1="5" y1="5" x2="5" y2="13" />
          </svg>
          <span>EZZO Monitor</span>
        </div>
        <div className="monitor-header-actions">
          {!isStandalone && (
            <button
              className="monitor-detach-btn"
              onClick={() => { invoke("open_monitor_window"); }}
              title="Abrir em janela separada"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="1" width="9" height="9" rx="1" />
                <line x1="1" y1="3" x2="2" y2="3" />
                <line x1="1" y1="8" x2="1" y2="1" />
                <line x1="1" y1="1" x2="8" y2="1" />
                <line x1="4" y1="1" x2="4" y2="0" />
              </svg>
            </button>
          )}
          <button className="monitor-close-btn" onClick={onClose} title="Fechar monitor">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="7" y2="7" />
              <line x1="7" y1="1" x2="1" y2="7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Ring Gauges */}
      <div className="monitor-rings">
        <RingGauge value={info.cpu_usage_total} color="#3b82f6" label="CPU" />
        <RingGauge value={info.ram_usage_pct} color="#a855f7" label="RAM" />
        {info.gpu.name !== "N/A" && <RingGauge value={info.gpu.usage_pct} color="#22c55e" label="GPU" />}
        {info.disks[0] && <RingGauge value={info.disks[0].usage_pct} color="#f59e0b" label="Disco" />}
      </div>

      {/* Charts */}
      <div className="monitor-charts">
        <MiniChart
          data={cpuHistory} color="#3b82f6" label="CPU"
          value={`${info.cpu_usage_total.toFixed(1)}%`}
          sub={`${info.cpu_cores} cores | ${info.cpus[0]?.name || "N/A"}`}
        />
        <MiniChart
          data={ramHistory} color="#a855f7" label="RAM"
          value={`${info.ram_used_gb} / ${info.ram_total_gb} GB`}
          sub={`Swap: ${info.swap_used_gb} / ${info.swap_total_gb} GB`}
        />
        <MiniChart
          data={gpuHistory} color="#22c55e" label="GPU"
          value={info.gpu.name !== "N/A" ? `${info.gpu.usage_pct.toFixed(1)}%` : "N/A"}
          sub={info.gpu.name !== "N/A" ? `${info.gpu.memory_used_mb} / ${info.gpu.memory_total_mb} MB` : "Sem GPU dedicada"}
        />
        <MiniChart
          data={netHistory} color="#06b6d4" label="Rede"
          value={`${netHistory[netHistory.length - 1]?.toFixed(2) || "0"} MB/s`}
          sub={`Enviado: ${info.network_sent_mb} MB | Recebido: ${info.network_recv_mb} MB`}
          maxVal={Math.max(1, ...netHistory) * 1.2}
        />
      </div>

      {/* Disks */}
      {info.disks.length > 0 && (
        <div className="monitor-disks">
          <div className="monitor-section-title">Discos</div>
          {info.disks.map((d, i) => (
            <div key={i} className="monitor-disk-row">
              <span className="monitor-disk-label">{d.mount || d.name}</span>
              <div className="monitor-disk-bar">
                <div className="monitor-disk-fill" style={{
                  width: `${d.usage_pct}%`,
                  background: d.usage_pct > 90 ? "#ef4444" : d.usage_pct > 70 ? "#f59e0b" : "#3b82f6"
                }} />
              </div>
              <span className="monitor-disk-value">{d.used_gb}/{d.total_gb} GB</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="monitor-footer">
        <span>Uptime: {formatUptime(info.uptime_secs)}</span>
        <span>Processos: {info.process_count}</span>
        {info.gpu.name !== "N/A" && info.gpu.temperature > 0 ? <span>GPU: {info.gpu.temperature}°C</span> : null}
      </div>
    </div>
  );
}
