import { useEffect, useRef, useState, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Command {
    id: string;
    label: string;
    shortcut?: string;
    category: string;
    icon?: string;
    action: () => void;
}

interface CommandPaletteProps {
    commands: Command[];
    onClose: () => void;
}

function CommandIcon({ icon }: { icon?: string }) {
    const name = icon || "chevron_right";
    return <span className="material-symbols-outlined cmd-icon">{name}</span>;
}

// ─── Command Palette Component ───────────────────────────────────────────────
export default function CommandPalette({ commands, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Filter commands based on query
    const filtered = commands.filter((cmd) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
            cmd.label.toLowerCase().includes(q) ||
            cmd.category.toLowerCase().includes(q) ||
            (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
        );
    });

    // Reset selection when filter changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Focus input on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 30);
    }, []);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current && filtered[selectedIndex]) {
            const items = listRef.current.querySelectorAll(".cmd-item");
            if (items[selectedIndex]) {
                items[selectedIndex].scrollIntoView({ block: "nearest" });
            }
        }
    }, [selectedIndex, filtered.length]);

    const executeSelected = useCallback(() => {
        if (filtered[selectedIndex]) {
            filtered[selectedIndex].action();
            onClose();
        }
    }, [filtered, selectedIndex, onClose]);

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
        }
    };

    // ─── Group by category ────────────────────────────────────────────────────
    const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
        if (!acc[cmd.category]) acc[cmd.category] = [];
        acc[cmd.category].push(cmd);
        return acc;
    }, {});

    const categoryOrder = ["Geral", "Painéis", "Abas", "Ferramentas", "Janela", "Ajuda"];

    return (
        <div className="cmd-palette-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cmd-palette" onMouseDown={(e) => e.stopPropagation()}>
                {/* Search input */}
                <div className="cmd-palette-input-wrap">
                    <span className="material-symbols-outlined cmd-palette-search-icon">search</span>
                    <input
                        ref={inputRef}
                        className="cmd-palette-input"
                        type="text"
                        placeholder="Escreve um comando..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        spellCheck={false}
                        autoComplete="off"
                    />
                    {query && (
                        <button className="cmd-palette-clear" onClick={() => setQuery("")} title="Limpar">
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                        </button>
                    )}
                </div>

                {/* Results */}
                <div ref={listRef} className="cmd-palette-results">
                    {filtered.length === 0 ? (
                        <div className="cmd-palette-empty">
                            <span className="material-symbols-outlined" style={{ fontSize: 24, opacity: 0.3 }}>search_off</span>
                            <span>Nenhum comando encontrado</span>
                        </div>
                    ) : (
                        categoryOrder.map((cat) => {
                            if (!grouped[cat]) return null;
                            return (
                                <div key={cat} className="cmd-category">
                                    <div className="cmd-category-label">{cat}</div>
                                    {grouped[cat].map((cmd, _idx) => {
                                        const globalIdx = filtered.indexOf(cmd);
                                        return (
                                            <div
                                                key={cmd.id}
                                                className={`cmd-item${globalIdx === selectedIndex ? " cmd-selected" : ""}`}
                                                onClick={() => { cmd.action(); onClose(); }}
                                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                                            >
                                                <CommandIcon icon={cmd.icon} />
                                                <span className="cmd-item-label">{cmd.label}</span>
                                                <span className="cmd-spacer" />
                                                {cmd.shortcut && <span className="cmd-shortcut">{cmd.shortcut}</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="cmd-palette-footer">
                    <span className="cmd-footer-hint">↑↓ Navegar</span>
                    <span className="cmd-footer-hint">↵ Executar</span>
                    <span className="cmd-footer-hint">Esc Fechar</span>
                </div>
            </div>
        </div>
    );
}