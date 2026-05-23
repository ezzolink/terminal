import { useState, useEffect, useCallback } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

interface UpdateStatus {
    state: "idle" | "checking" | "available" | "downloading" | "downloaded" | "error";
    version?: string;
    progress?: number;
    error?: string;
}

const UPDATE_EVENT = "ezzo-update-progress";

export function useUpdateCheck() {
    const [status, setStatus] = useState<UpdateStatus>({ state: "idle" });

    useEffect(() => {
        const timer = setTimeout(() => checkForUpdates(), 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handler = (e: CustomEvent) => {
            const pct = e.detail?.progress;
            if (typeof pct === "number") {
                setStatus(prev => ({ ...prev, state: "downloading", progress: pct }));
            }
        };
        window.addEventListener(UPDATE_EVENT, handler as EventListener);
        return () => window.removeEventListener(UPDATE_EVENT, handler as EventListener);
    }, []);

    const checkForUpdates = useCallback(async () => {
        if (status.state === "checking" || status.state === "downloading") return;
        setStatus({ state: "checking" });
        try {
            const update = await check();
            if (update?.available) {
                setStatus({ state: "available", version: update.version });
            } else {
                setStatus({ state: "idle" });
            }
        } catch (e: any) {
            setStatus({ state: "error", error: String(e) });
            setTimeout(() => setStatus({ state: "idle" }), 4000);
        }
    }, [status.state]);

    const downloadUpdate = useCallback(async () => {
        try {
            const update = await check();
            if (!update?.available) { setStatus({ state: "idle" }); return; }
            setStatus({ state: "downloading", progress: 0, version: update.version });

            let totalBytes = 0;
            let downloadedBytes = 0;

            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case "Started":
                        totalBytes = event.data.contentLength || 0;
                        downloadedBytes = 0;
                        setStatus(prev => ({ ...prev, progress: 0 }));
                        break;
                    case "Progress":
                        downloadedBytes += event.data.chunkLength;
                        const pct = totalBytes > 0
                            ? Math.round((downloadedBytes / totalBytes) * 100)
                            : Math.min((status.progress || 0) + 5, 90);
                        setStatus(prev => ({ ...prev, progress: Math.min(pct, 99) }));
                        window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { progress: Math.min(pct, 99) } }));
                        break;
                    case "Finished":
                        setStatus(prev => ({ ...prev, state: "downloaded", progress: 100 }));
                        window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { progress: 100, finished: true } }));
                        break;
                }
            });
            setStatus({ state: "downloaded", version: update.version });
        } catch (e: any) {
            setStatus({ state: "error", error: String(e) });
            setTimeout(() => setStatus({ state: "idle" }), 4000);
        }
    }, []);

    const installAndRestart = useCallback(async () => {
        try { await relaunch(); }
        catch (e: any) { setStatus({ state: "error", error: String(e) }); }
    }, []);

    return { status, checkForUpdates, downloadUpdate, installAndRestart };
}

export default function UpdateSection() {
    const { status, checkForUpdates, downloadUpdate, installAndRestart } = useUpdateCheck();
    return (
        <div className="settings-section">
            <label className="settings-label">Versao</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="update-version-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "rgba(59,130,246,0.7)" }}>info</span>
                        <span className="update-version-text">EZZO Terminal v1.5.0</span>
                    </div>
                    {status.state === "idle" && <span className="update-badge update-badge-ok">ATUALIZADO</span>}
                    {status.state === "downloaded" && <span className="update-badge update-badge-ready">PRONTO</span>}
                </div>
                {status.state === "idle" && (
                    <button onClick={checkForUpdates} className="snippet-add-btn" style={{ fontSize: 11, width: "100%" }}>
                        Verificar Actualizacoes
                    </button>
                )}
                {status.state === "checking" && (
                    <div className="update-state-box" style={{ background: "rgba(59,130,246,0.06)" }}>
                        <div className="update-spinner" />
                        <span style={{ fontSize: 11, color: "rgba(148,163,184,0.6)" }}>A verificar...</span>
                    </div>
                )}
                {status.state === "available" && (
                    <div className="update-available-box">
                        <div className="update-available-header">
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#22c55e" }}>new_releases</span>
                            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Nova versao: v{status.version}</span>
                        </div>
                        <button onClick={downloadUpdate} className="snippet-add-btn" style={{ fontSize: 10, width: "100%" }}>
                            Baixar e Instalar
                        </button>
                    </div>
                )}
                {status.state === "downloading" && (
                    <div className="update-download-box">
                        <div className="update-download-header">
                            <span style={{ fontSize: 10, color: "#3b82f6", fontWeight: 500 }}>A transferir...</span>
                            <span className="update-percent">{status.progress || 0}%</span>
                        </div>
                        <div className="update-progress-bar">
                            <div className="update-progress-fill" style={{ width: `${status.progress || 0}%` }} />
                        </div>
                    </div>
                )}
                {status.state === "downloaded" && (
                    <div className="update-ready-box">
                        <div className="update-ready-header">
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#22c55e" }}>download_done</span>
                            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Pronto! v{status.version}</span>
                        </div>
                        <p style={{ fontSize: 10, color: "rgba(148,163,184,0.6)", margin: "6px 0", textAlign: "center" }}>
                            Sessao sera restaurada apos reiniciar.
                        </p>
                        <button onClick={installAndRestart} className="update-install-btn">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>restart_alt</span>
                            Instalar e Reiniciar
                        </button>
                    </div>
                )}
                {status.state === "error" && (
                    <div className="update-error-box">
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#ef4444" }}>error</span>
                        <span style={{ fontSize: 10, color: "rgba(248,113,113,0.7)" }}>{status.error || "Erro"}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
