import { useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ExtensionCommand {
  name: string;
  command: string;
  category: string;
}

interface Extension {
  id: string;
  name: string;
  description: string;
  icon: string;
  commands: ExtensionCommand[];
}

interface ExtensionsPanelProps {
  onInstallCommands: (commands: ExtensionCommand[]) => void;
  onClose: () => void;
}

const AVAILABLE_EXTENSIONS: Extension[] = [
  {
    id: "git",
    name: "Git",
    description: "Comandos Git essenciais: status, log, commit, push, pull, branch, stash, diff",
    icon: "code",
    commands: [
      { name: "Git Status", command: "git status", category: "Git" },
      { name: "Git Log", command: "git log --oneline -10", category: "Git" },
      { name: "Git Add All", command: "git add .", category: "Git" },
      { name: "Git Commit", command: "git commit -m \"\"", category: "Git" },
      { name: "Git Push", command: "git push", category: "Git" },
      { name: "Git Pull", command: "git pull", category: "Git" },
      { name: "Git Branch", command: "git branch", category: "Git" },
      { name: "Git Stash", command: "git stash", category: "Git" },
      { name: "Git Diff", command: "git diff", category: "Git" },
    ],
  },
  {
    id: "docker",
    name: "Docker",
    description: "Comandos Docker: ps, images, pull, build, compose, prune",
    icon: "terminal",
    commands: [
      { name: "Docker PS", command: "docker ps", category: "Docker" },
      { name: "Docker Images", command: "docker images", category: "Docker" },
      { name: "Docker Pull", command: "docker pull", category: "Docker" },
      { name: "Docker Build", command: "docker build -t .", category: "Docker" },
      { name: "Docker Compose Up", command: "docker-compose up -d", category: "Docker" },
      { name: "Docker Compose Down", command: "docker-compose down", category: "Docker" },
      { name: "Docker Prune", command: "docker system prune -f", category: "Docker" },
    ],
  },
  {
    id: "clean",
    name: "Clean",
    description: "Comandos de limpeza: temp, cache npm, docker prune, disk cleanup",
    icon: "cleaning_services",
    commands: [
      { name: "Limpar Temp", command: "del /q /s %TEMP%\\* 2>nul & rmdir /q /s %TEMP% 2>nul", category: "Clean" },
      { name: "Limpar NPM Cache", command: "npm cache clean --force", category: "Clean" },
      { name: "Limpar Docker", command: "docker system prune -a -f", category: "Clean" },
      { name: "Disk Cleanup", command: "cleanmgr", category: "Clean" },
      { name: "Limpar Prefetch", command: "del /q /s C:\\Windows\\Prefetch\\* 2>nul", category: "Clean" },
    ],
  },
  {
    id: "prettier",
    name: "Prettier",
    description: "Formatacao de codigo com Prettier: JS, TS, CSS, JSON, HTML, MD",
    icon: "format_align_left",
    commands: [
      { name: "Format JS/TS", command: "npx prettier --write \"src/**/*.{js,jsx,ts,tsx}\"", category: "Prettier" },
      { name: "Format CSS", command: "npx prettier --write \"src/**/*.css\"", category: "Prettier" },
      { name: "Format JSON", command: "npx prettier --write \"**/*.json\"", category: "Prettier" },
      { name: "Format HTML", command: "npx prettier --write \"**/*.html\"", category: "Prettier" },
      { name: "Format Markdown", command: "npx prettier --write \"**/*.md\"", category: "Prettier" },
      { name: "Format All", command: "npx prettier --write \"src/**/*\"", category: "Prettier" },
    ],
  },
  {
    id: "npm",
    name: "NPM",
    description: "Comandos NPM: install, dev, build, test, audit, outdated",
    icon: "package",
    commands: [
      { name: "NPM Install", command: "npm install", category: "NPM" },
      { name: "NPM Run Dev", command: "npm run dev", category: "NPM" },
      { name: "NPM Run Build", command: "npm run build", category: "NPM" },
      { name: "NPM Test", command: "npm test", category: "NPM" },
      { name: "NPM Audit", command: "npm audit", category: "NPM" },
      { name: "NPM Outdated", command: "npm outdated", category: "NPM" },
    ],
  },
  {
    id: "rust",
    name: "Rust/Cargo",
    description: "Comandos Cargo: build, run, test, clippy, fmt, docs",
    icon: "terminal",
    commands: [
      { name: "Cargo Build", command: "cargo build", category: "Rust" },
      { name: "Cargo Run", command: "cargo run", category: "Rust" },
      { name: "Cargo Test", command: "cargo test", category: "Rust" },
      { name: "Cargo Clippy", command: "cargo clippy", category: "Rust" },
      { name: "Cargo Fmt", command: "cargo fmt", category: "Rust" },
      { name: "Cargo Build Release", command: "cargo build --release", category: "Rust" },
      { name: "Cargo Docs", command: "cargo doc --open", category: "Rust" },
    ],
  },
];

// ─── Save/Load installed extensions from localStorage ─────────────────────────
const STORAGE_KEY = "ezzo-terminal-extensions";

function loadInstalled(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return [];
}

function saveInstalled(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

// ─── Extensions Panel Component ───────────────────────────────────────────────
export default function ExtensionsPanel({ onInstallCommands, onClose }: ExtensionsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [installed, setInstalled] = useState<string[]>(loadInstalled);
  const [expandedExt, setExpandedExt] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleToggle = (ext: Extension) => {
    if (installed.includes(ext.id)) {
      const next = installed.filter((id) => id !== ext.id);
      setInstalled(next);
      saveInstalled(next);
    } else {
      const next = [...installed, ext.id];
      setInstalled(next);
      saveInstalled(next);
      onInstallCommands(ext.commands);
    }
  };

  return (
    <div ref={panelRef} className="extensions-panel">
      <div className="extensions-header">
        <span className="extensions-title">Extensoes</span>
        <span className="extensions-count">{installed.length} instaladas</span>
        <button className="extensions-close" onClick={onClose} title="Fechar">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
        </button>
      </div>
      <div className="extensions-list">
        {AVAILABLE_EXTENSIONS.map((ext) => {
          const isInstalled = installed.includes(ext.id);
          const isExpanded = expandedExt === ext.id;
          return (
            <div key={ext.id} className={`extension-card${isInstalled ? " installed" : ""}${isExpanded ? " expanded" : ""}`}>
              <div className="extension-main" onClick={() => setExpandedExt(isExpanded ? null : ext.id)}>
                <div className="extension-info">
                  <span className="material-symbols-outlined extension-icon">{ext.icon}</span>
                  <div className="extension-meta">
                    <div className="extension-name">{ext.name}</div>
                    <div className="extension-desc">{ext.description}</div>
                  </div>
                </div>
                <button
                  className={`extension-btn${isInstalled ? " installed" : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleToggle(ext); }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                    {isInstalled ? "check_circle" : "add_circle"}
                  </span>
                  {isInstalled ? "Instalada" : "Instalar"}
                </button>
              </div>
              <div className="extension-commands">
                {ext.commands.map((cmd, i) => (
                  <div key={i} className="extension-cmd-row">
                    <span className="extension-cmd-name">{cmd.name}</span>
                    <span className="extension-cmd-text">{cmd.command}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
