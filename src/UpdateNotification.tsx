import { useEffect, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface UpdateNotificationProps {
  status: {
    state: "idle" | "checking" | "available" | "downloading" | "downloaded" | "error";
    version?: string;
    progress?: number;
    error?: string;
  };
  onInstall: () => void;
  onDismiss: () => void;
  onSkipVersion: () => void;
}

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const IconCheckCircle = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
    <path d="M5.5 8l2 2 3-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Spinner ────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div className="update-modal-spinner" />
);

// ─── Progress Bar ───────────────────────────────────────────────────────────
function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.min(100, Math.max(0, progress ?? 0));
  return (
    <div className="update-modal-progress-track">
      <div className="update-modal-progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function UpdateNotification({
  status,
  onInstall,
  onDismiss,
  onSkipVersion,
}: UpdateNotificationProps) {
  const [visible, setVisible] = useState(false);
  const [skipChecked, setSkipChecked] = useState(false);

  // ─── Animate in when state changes to a visible one ──────────────────────
  useEffect(() => {
    const showable = new Set(["available", "downloading", "downloaded", "error"]);
    if (showable.has(status.state)) {
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [status.state]);

  // ─── Don't render at all for idle ────────────────────────────────────────
  if (status.state === "idle") return null;

  // ─── Checking: subtle inline notification ────────────────────────────────
  if (status.state === "checking") {
    return (
      <div className="update-modal-checking">
        <Spinner />
        <span className="update-modal-checking-text">A verificar atualizações...</span>
      </div>
    );
  }

  // ─── Visible overlay states ──────────────────────────────────────────────
  const currentVersion = "1.5.1";

  return (
    <div className={`update-modal-overlay ${visible ? "update-modal-visible" : ""}`}>
      <div className="update-modal-card">
        {/* ── Header Icon ──────────────────────────────────────────────── */}
        <div className="update-modal-icon-wrap">
          {status.state === "error" ? (
            <span className="material-symbols-outlined update-modal-icon-error">error</span>
          ) : status.state === "downloaded" ? (
            <span className="material-symbols-outlined update-modal-icon-ready">download_done</span>
          ) : (
            <span className="material-symbols-outlined update-modal-icon">new_releases</span>
          )}
        </div>

        {/* ── Title ────────────────────────────────────────────────────── */}
        <h2 className="update-modal-title">
          {status.state === "error" ? "Erro na Atualização" : "Atualização Disponível!"}
        </h2>

        {/* ── Version Row ──────────────────────────────────────────────── */}
        {(status.state === "available" || status.state === "downloading" || status.state === "downloaded") && (
          <div className="update-modal-versions">
            <div className="update-modal-version-tag update-modal-version-old">
              <span className="update-modal-version-label">Atual</span>
              <span className="update-modal-version-value">{currentVersion}</span>
            </div>
            <span className="material-symbols-outlined update-modal-version-arrow">arrow_forward</span>
            <div className="update-modal-version-tag update-modal-version-new">
              <span className="update-modal-version-label">Nova</span>
              <span className="update-modal-version-value">{status.version ?? "—"}</span>
            </div>
          </div>
        )}

        {/* ── Error Message ────────────────────────────────────────────── */}
        {status.state === "error" && (
          <p className="update-modal-error-text">
            {status.error ?? "Ocorreu um erro ao verificar atualizações."}
          </p>
        )}

        {/* ── Body Content ─────────────────────────────────────────────── */}
        <div className="update-modal-body">
          {/* Available — offer download trigger */}
          {status.state === "available" && (
            <p className="update-modal-info">
              Uma nova versão{" "}
              <strong className="update-modal-highlight">{status.version}</strong>{" "}
              está disponível para transferir.
            </p>
          )}

          {/* Downloading — show progress */}
          {status.state === "downloading" && (
            <div className="update-modal-download-area">
              <div className="update-modal-download-header">
                <span className="update-modal-download-label">A transferir atualização...</span>
                <span className="update-modal-download-percent">
                  {status.progress != null ? `${Math.round(status.progress)}%` : "—"}
                </span>
              </div>
              <ProgressBar progress={status.progress ?? 0} />
            </div>
          )}

          {/* Downloaded — ready to install */}
          {status.state === "downloaded" && (
            <>
              <p className="update-modal-ready-text">
                <IconCheckCircle />
                <span>Transferência concluída! Pronto para instalar.</span>
              </p>

              {/* Skip version checkbox */}
              <label className="update-modal-skip-label">
                <input
                  type="checkbox"
                  className="update-modal-skip-checkbox"
                  checked={skipChecked}
                  onChange={() => setSkipChecked((v) => !v)}
                />
                <span className="update-modal-skip-text">Ignorar esta versão</span>
              </label>
            </>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="update-modal-actions">
          {/* Green install button (available + downloaded) */}
          {(status.state === "available" || status.state === "downloaded") && (
            <button className="update-modal-btn update-modal-btn-primary" onClick={onInstall}>
              <span className="material-symbols-outlined update-modal-btn-icon">download</span>
              {status.state === "available" ? "Transferir Agora" : "Instalar Agora"}
            </button>
          )}

          {/* Dismiss / secondary */}
          {(status.state === "available" || status.state === "downloaded" || status.state === "error") && (
            <button className="update-modal-btn update-modal-btn-secondary" onClick={onDismiss}>
              {status.state === "error" ? "Fechar" : "Agora Não"}
            </button>
          )}

          {/* Skip link (only when downloaded) */}
          {status.state === "downloaded" && skipChecked && (
            <button className="update-modal-skip-link" onClick={onSkipVersion}>
              Ignorar esta versão e não perguntar novamente
            </button>
          )}
        </div>

        {/* ── Footer hint ──────────────────────────────────────────────── */}
        {status.state === "downloaded" && !skipChecked && (
          <p className="update-modal-footer-hint">
            Selecione "Ignorar esta versão" acima para a ocultar permanentemente.
          </p>
        )}
      </div>
    </div>
  );
}


