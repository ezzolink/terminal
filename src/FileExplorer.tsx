import { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
}

interface FileExplorerProps {
  initialPath: string;
  onNavigate: (path: string) => void;
  onClose: () => void;
  onOpenInExplorer: (path: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const ICONS: Record<string, string> = {
  // File type icons
  ts: "javascript", tsx: "javascript", js: "javascript", jsx: "javascript",
  rs: "terminal", go: "terminal", py: "terminal",
  css: "css", scss: "css", html: "html",
  json: "data_object", md: "description", txt: "description",
  gitignore: "hide_source", env: "settings",
  png: "image", jpg: "image", jpeg: "image", gif: "image", svg: "image",
  ico: "image",
  zip: "folder_zip", tar: "folder_zip", gz: "folder_zip",
  exe: "terminal", dll: "terminal",
  pdf: "picture_as_pdf",
  toml: "settings", yml: "settings", yaml: "settings", lock: "lock",
};

function getFileIcon(name: string, isDir: boolean): string {
  if (isDir) return "folder";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ICONS[ext] || "insert_drive_file";
}

export default function FileExplorer({ initialPath, onNavigate, onClose, onOpenInExplorer }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pathEditing, setPathEditing] = useState(false);
  const [pathInput, setPathInput] = useState(initialPath);
  const pathInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<string[]>([initialPath]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true);
    try {
      const files = await invoke<FileEntry[]>("list_directory", { path: dir });
      setEntries(files);
      setCurrentPath(dir);
      setPathInput(dir);
      onNavigate(dir);
    } catch (e) {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [onNavigate]);

  useEffect(() => {
    loadDir(initialPath);
    setHistory([initialPath]);
    setHistoryIdx(0);
  }, [initialPath, loadDir]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    if (pathEditing && pathInputRef.current) {
      pathInputRef.current.focus();
      pathInputRef.current.select();
    }
  }, [pathEditing]);

  const navigateDir = useCallback((dir: string) => {
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(dir);
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
    loadDir(dir);
  }, [history, historyIdx, loadDir]);

  const goBack = useCallback(() => {
    if (historyIdx > 0) {
      const idx = historyIdx - 1;
      setHistoryIdx(idx);
      loadDir(history[idx]);
    }
  }, [history, historyIdx, loadDir]);

  const goForward = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const idx = historyIdx + 1;
      setHistoryIdx(idx);
      loadDir(history[idx]);
    }
  }, [history, historyIdx, loadDir]);

  const goUp = useCallback(() => {
    const parent = currentPath.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
    if (parent && parent !== currentPath) {
      navigateDir(parent);
    }
  }, [currentPath, navigateDir]);

  const commitPath = useCallback(() => {
    setPathEditing(false);
    loadDir(pathInput);
  }, [pathInput, loadDir]);

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.is_dir) {
      navigateDir(entry.path);
    }
  };

  return (
    <div ref={panelRef} className="file-explorer">
      <div className="file-explorer-header">
        <div className="file-explorer-title-row">
          <span className="material-symbols-outlined file-explorer-title-icon">folder</span>
          <span className="file-explorer-title">Ficheiros</span>
          <div className="file-explorer-nav">
            <button className="fe-nav-btn" onClick={goBack} disabled={historyIdx <= 0} title="Voltar">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span>
            </button>
            <button className="fe-nav-btn" onClick={goForward} disabled={historyIdx >= history.length - 1} title="Avancar">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
            </button>
            <button className="fe-nav-btn" onClick={goUp} title="Subir">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_upward</span>
            </button>
            <button className="fe-nav-btn" onClick={() => onOpenInExplorer(currentPath)} title="Abrir no Explorador">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
            </button>
          </div>
          <button className="file-explorer-close" onClick={onClose} title="Fechar">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
          </button>
        </div>
        <div className="file-explorer-path-row">
          {pathEditing ? (
            <input
              ref={pathInputRef}
              className="fe-path-input"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitPath(); if (e.key === "Escape") { setPathEditing(false); setPathInput(currentPath); } }}
              onBlur={commitPath}
            />
          ) : (
            <span className="fe-path-text" onClick={() => setPathEditing(true)} title="Clique para editar">
              {currentPath}
            </span>
          )}
        </div>
      </div>
      <div className="file-explorer-body">
        {loading ? (
          <div className="fe-loading">
            <div className="fe-spinner" />
            <span>A carregar...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="fe-empty">Pasta vazia</div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.path}
              className={`fe-entry${entry.is_dir ? " fe-dir" : ""}`}
              onClick={() => handleEntryClick(entry)}
              onDoubleClick={() => { if (!entry.is_dir) onOpenInExplorer(entry.path); }}
              title={entry.path}
            >
              <span className={`material-symbols-outlined fe-entry-icon${entry.is_dir ? " fe-dir-icon" : ""}`}>
                {getFileIcon(entry.name, entry.is_dir)}
              </span>
              <span className="fe-entry-name">{entry.name}</span>
              {!entry.is_dir && entry.size_bytes > 0 && (
                <span className="fe-entry-size">{formatSize(entry.size_bytes)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
