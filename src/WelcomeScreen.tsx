import { useState } from "react";
import ezzoLogo from "./assets/logo-azul.png";

interface WelcomeScreenProps {
    onDismiss: () => void;
}

export default function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
    const [accepted, setAccepted] = useState(false);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(4, 4, 10, 0.96)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Inter', sans-serif",
            }}
        >
            <div
                style={{
                    maxWidth: 420,
                    width: "90vw",
                    textAlign: "center",
                    padding: "32px 28px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 30px rgba(59,130,246,0.08)",
                }}
            >
                <img
                    src={ezzoLogo}
                    alt="EZZO"
                    style={{ height: 48, marginBottom: 16, opacity: 0.9 }}
                />
                <h1
                    style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#f0f3ff",
                        marginBottom: 4,
                        letterSpacing: "0.02em",
                    }}
                >
                    EZZO Terminal
                </h1>
                <p
                    style={{
                        fontSize: 12,
                        color: "rgba(148,163,184,0.7)",
                        marginBottom: 8,
                    }}
                >
                    EZZO Digital Inc.
                </p>
                <p
                    style={{
                        fontSize: 11,
                        color: "rgba(100,116,139,0.6)",
                        fontFamily: "'JetBrains Mono', monospace",
                        marginBottom: 20,
                    }}
                >
                    Versão 1.5.1
                </p>

                <div
                    style={{
                        textAlign: "left",
                        fontSize: 12,
                        color: "rgba(148,163,184,0.55)",
                        lineHeight: 1.7,
                        marginBottom: 20,
                        background: "rgba(255,255,255,0.02)",
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.04)",
                    }}
                >
                    <p style={{ marginBottom: 8 }}>
                        <strong style={{ color: "rgba(200,210,230,0.7)" }}>Bem-vindo ao EZZO Terminal!</strong>
                    </p>
                    <p>
                        Um terminal moderno com suporte a shells CMD, PowerShell e WSL, múltiplas abas, split de painéis,
                        monitor de sistema integrado, snippets personalizáveis e temas translúcidos.
                    </p>
                    <p style={{ marginTop: 8, fontSize: 10.5, color: "rgba(100,116,139,0.4)" }}>
                        Ao usar este software, concorda com os termos de uso e política de privacidade da EZZO Digital Inc.
                    </p>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginBottom: 18,
                        cursor: "pointer",
                        userSelect: "none",
                    }}
                    onClick={() => setAccepted(!accepted)}
                >
                    <div
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            border: accepted
                                ? "2px solid #3b82f6"
                                : "2px solid rgba(255,255,255,0.15)",
                            background: accepted
                                ? "rgba(59,130,246,0.2)"
                                : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.15s",
                        }}
                    >
                        {accepted && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round">
                                <polyline points="1,4 3.5,6.5 9,1" />
                            </svg>
                        )}
                    </div>
                    <span style={{ fontSize: 12, color: "rgba(148,163,184,0.5)" }}>
                        Li e aceito os termos de uso
                    </span>
                </div>

                <button
                    onClick={() => { if (accepted) onDismiss(); }}
                    disabled={!accepted}
                    style={{
                        width: "100%",
                        padding: "10px 0",
                        borderRadius: 8,
                        border: "none",
                        background: accepted
                            ? "linear-gradient(135deg, #3b82f6, #2563eb)"
                            : "rgba(255,255,255,0.05)",
                        color: accepted ? "#fff" : "rgba(148,163,184,0.3)",
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        cursor: accepted ? "pointer" : "not-allowed",
                        transition: "all 0.2s",
                        letterSpacing: "0.03em",
                        boxShadow: accepted ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
                    }}
                >
                    Começar
                </button>
            </div>
        </div>
    );
}