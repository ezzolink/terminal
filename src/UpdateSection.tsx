import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface UpdateStatus {
    state: "idle" | "checking" | "updating" | "downloading" | "ready" | "error";
    version?: string;
    progress?: number;
    error?: string;
}

export default function UpdateSection() {
    const [status, setStatus] = useState<UpdateStatus>({ state: "idle" });

    const checkForUpdates = async () => {
        setStatus({ state: "checking" });
        try {
            const result = await invoke<{ latest: string; current: string; updateNeeded: boolean }>("check_for_updates");
            if (result.updateNeeded) {
                setStatus({ state: "ready", version: result.latest });
            } else {
                setStatus({ state: "idle", version: result.current });
                // Reset after 2s
                setTimeout(() => setStatus({ state: "idle" }), 2000);
            }
        } catch (e: any) {
            setStatus({ state: "error", error: String(e) });
            setTimeout(() => setStatus({ state: "idle" }), 3000);
        }
    };

    const downloadUpdate = async () => {
        setStatus((prev) => ({ ...prev, state: "downloading", progress: 0 }));
        try {
            // Simulate download progress
            for (let i = 10; i <= 100; i += 15) {
                await new Promise((r) => setTimeout(r, 400));
                setStatus((prev) => ({ ...prev, progress: i }));
            }
            setStatus({ state: "downloading", progress: 100 });
            // In production, this would trigger the installer
            setTimeout(() => {
                setStatus({ state: "idle" });
            }, 2000);
        } catch (e: any) {
            setStatus({ state: "error", error: String(e) });
        }
    };

    return (
        <div className="settings-section">
            <label className="settings-label">Versão</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Version info */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 16, color: "rgba(59,130,246,0.7)" }}
                        >
                            info
                        </span>
                        <span
                            style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 11,
                                color: "rgba(200,210,240,0.7)",
                            }}
                        >
                            EZZO Terminal v1.5.0
                        </span>
                    </div>
                    {status.state === "idle" && !status.version && (
                        <span
                            style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 9,
                                color: "#22c55e",
                                padding: "2px 8px",
                                background: "rgba(34,197,94,0.1)",
                                borderRadius: 4,
                                border: "1px solid rgba(34,197,94,0.2)",
                            }}
                        >
                            ATUALIZADO
                        </span>
                    )}
                    {status.state === "idle" && status.version && (
                        <span
                            style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 9,
                                color: "#22c55e",
                                padding: "2px 8px",
                                background: "rgba(34,197,94,0.1)",
                                borderRadius: 4,
                                border: "1px solid rgba(34,197,94,0.2)",
                            }}
                        >
                            ATUALIZADO
                        </span>
                    )}
                </div>

                {/* Check button */}
                {status.state === "idle" && (
                    <button
                        onClick={checkForUpdates}
                        className="snippet-add-btn"
                        style={{ fontSize: 11, width: "100%" }}
                    >
                        Verificar Atualizações
                    </button>
                )}

                {/* Checking state */}
                {status.state === "checking" && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            background: "rgba(59,130,246,0.06)",
                            borderRadius: 6,
                        }}
                    >
                        <div
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                border: "2px solid rgba(59,130,246,0.2)",
                                borderTopColor: "#3b82f6",
                                animation: "spin 0.6s linear infinite",
                            }}
                        />
                        <span style={{ fontSize: 11, color: "rgba(148,163,184,0.6)" }}>
                            A verificar actualizações...
                        </span>
                    </div>
                )}

                {/* Update available */}
                {status.state === "ready" && (
                    <div
                        style={{
                            padding: "10px 12px",
                            background: "rgba(34,197,94,0.06)",
                            borderRadius: 6,
                            border: "1px solid rgba(34,197,94,0.15)",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 8,
                            }}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: 14, color: "#22c55e" }}
                            >
                                new_releases
                            </span>
                            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
                                Nova versão disponível: v{status.version}
                            </span>
                        </div>
                        <button
                            className="snippet-add-btn"
                            onClick={downloadUpdate}
                            style={{ fontSize: 10, width: "100%" }}
                        >
                            Baixar e Instalar
                        </button>
                    </div>
                )}

                {/* Downloading */}
                {status.state === "downloading" && (
                    <div
                        style={{
                            padding: "10px 12px",
                            background: "rgba(59,130,246,0.06)",
                            borderRadius: 6,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 6,
                            }}
                        >
                            <span style={{ fontSize: 10, color: "#3b82f6", fontWeight: 500 }}>
                                A transferir actualização...
                            </span>
                            <span
                                style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 9,
                                    color: "rgba(148,163,184,0.5)",
                                }}
                            >
                                {status.progress || 0}%
                            </span>
                        </div>
                        <div
                            style={{
                                height: 4,
                                background: "rgba(255,255,255,0.06)",
                                borderRadius: 2,
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    height: "100%",
                                    width: `${status.progress || 0}%`,
                                    background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                                    borderRadius: 2,
                                    transition: "width 0.3s ease",
                                }}
                            />
                        </div>
                        {status.progress === 100 && (
                            <p
                                style={{
                                    fontSize: 10,
                                    color: "#22c55e",
                                    marginTop: 8,
                                    textAlign: "center",
                                }}
                            >
                                Transferência concluída! A instalar...
                            </p>
                        )}
                    </div>
                )}

                {/* Error */}
                {status.state === "error" && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "8px 12px",
                            background: "rgba(239,68,68,0.08)",
                            borderRadius: 6,
                        }}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 14, color: "#ef4444" }}
                        >
                            error
                        </span>
                        <span style={{ fontSize: 10, color: "rgba(248,113,113,0.7)" }}>
                            {status.error || "Erro ao verificar actualização"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}