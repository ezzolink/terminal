import { useEffect, useRef, useState, useCallback } from "react";

interface HistorySearchProps {
  history: string[];
  onSelect: (command: string) => void;
  onClose: () => void;
}

export default function HistorySearch({ history, onSelect, onClose }: HistorySearchProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? history.filter((cmd) => cmd.toLowerCase().includes(query.toLowerCase()))
    : history;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  useEffect(() => {
    if (listRef.current && filtered[selectedIndex]) {
      const items = listRef.current.querySelectorAll(".hs-item");
      if (items[selectedIndex]) {
        items[selectedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, filtered.length]);

  const executeSelected = useCallback(() => {
    if (filtered[selectedIndex]) {
      onSelect(filtered[selectedIndex]);
      onClose();
    }
  }, [filtered, selectedIndex, onSelect, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      executeSelected();
    } else if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
      // Ctrl+R again: cycle to next match
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    }
  };

  return (
    <div className="hs-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hs-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="hs-input-wrap">
          <span className="material-symbols-outlined hs-search-icon">history</span>
          <input
            ref={inputRef}
            className="hs-input"
            type="text"
            placeholder='reverse-i-search:'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
          />
          <span className="hs-match-count">
            {filtered.length > 0 && `${selectedIndex + 1}/${filtered.length}`}
          </span>
        </div>
        <div ref={listRef} className="hs-results">
          {filtered.length === 0 ? (
            <div className="hs-empty">
              <span className="material-symbols-outlined" style={{ fontSize: 20, opacity: 0.3 }}>search_off</span>
              <span>Nenhum comando encontrado</span>
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const matchIdx = query ? cmd.toLowerCase().indexOf(query.toLowerCase()) : -1;
              return (
                <div
                  key={`${cmd}-${idx}`}
                  className={`hs-item${idx === selectedIndex ? " hs-selected" : ""}`}
                  onClick={() => { onSelect(cmd); onClose(); }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="hs-item-num">{history.length - history.indexOf(cmd)}</span>
                  {query && matchIdx >= 0 ? (
                    <span className="hs-item-cmd">
                      {cmd.slice(0, matchIdx)}
                      <span className="hs-match">{cmd.slice(matchIdx, matchIdx + query.length)}</span>
                      {cmd.slice(matchIdx + query.length)}
                    </span>
                  ) : (
                    <span className="hs-item-cmd">{cmd}</span>
                  )}
                  <span className="hs-item-arrow">
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>subdirectory_arrow_left</span>
                  </span>
                </div>
              );
            })
          )}
        </div>
        <div className="hs-footer">
          <span className="hs-footer-hint">↑↓ Navegar</span>
          <span className="hs-footer-hint">↵ Executar</span>
          <span className="hs-footer-hint">Ctrl+R Seguinte</span>
          <span className="hs-footer-hint">Esc Fechar</span>
        </div>
      </div>
    </div>
  );
}
