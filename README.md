# EZZO Terminal

<p align="center">
  <strong>Terminal moderno, elegante e translucido para Windows</strong>
  <br />
  <sub>Construido com Tauri v2 · React 19 · xterm.js 5 · Rust</sub>
</p>

<p align="center">
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-instalacao">Instalacao</a> •
  <a href="#-build">Build</a> •
  <a href="#-atalhos-de-teclado">Atalhos</a> •
  <a href="#-tecnologias">Tecnologias</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/versao-1.5.0-3b82f6?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/plataforma-Windows-0078D4?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/stack-Tauri%20v2%20|%20React%20|%20Rust-22c55e?style=flat-square" alt="Stack" />
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="License" />
</p>

---

## Sobre o Projeto

O **EZZO Terminal** e um terminal moderno, elegante e translucido para Windows, construido sobre o framework **Tauri v2** com frontend em **React** e backend em **Rust**. Utiliza **xterm.js** como emulador de terminal, suportando shells **CMD**, **PowerShell** e **WSL**.

Com uma interface limpa e profissional, efeitos glass/blur nativos, multiplas abas e paineis split, o EZZO Terminal foi desenhado para desenvolvedores que procuram uma experiencia de terminal superior no Windows.

> **Desenvolvido por:** EZZO Digital Inc.

---

## Funcionalidades

### Emulador de Terminal
- **Renderer WebGL** com fallback Canvas automatico
- **Scrollback** de 10.000 linhas
- 6 tipos de letra: JetBrains Mono, Cascadia Code, Consolas, Fira Code, Source Code Pro, Ubuntu Mono
- Tamanho ajustavel (10px a 24px via slider)
- Suporte Unicode/Emoji completo
- **Copy/Paste nativo** via Rust arboard
- Pesquisa incremental com Ctrl+F
- Processamento inteligente de quebras de linha

### Gestao de Abas
- Abas ilimitadas (Ctrl+Shift+N)
- Renomeacao inline com duplo clique
- Indicador do shell (CMD / PowerShell / WSL)
- Persistencia no localStorage
- Seletor de shell na barra de abas

### Paineis Split
- **Split Vertical** (Ctrl+Shift:D) — lado a lado
- **Split Horizontal** (Ctrl+Shift:H) — empilhados
- **Redimensionamento por drag** na divisoria
- Racio minimo 15% / maximo 85%

### 8 Temas de Cores
EZZO, Dracula, Monokai, Solarized, Nord, Tokyo Night, Gruvbox, Catppuccin

### Modos de Fundo
- **Escuro** — Fundo com efeito glass
- **Claro** — Fundo claro com texto escuro
- **Transparente** — RGBA semi-transparente + blur nativo do Windows

### Sistema de Snippets
- 20 snippets pre-instalados (Git, NPM, Docker, Rust, Python, etc.)
- Criacao rapida com Ctrl+Shift+K
- Categorias personalizaveis
- Execucao com um clique

### Sugestoes Inteligentes (Ghost Text)
- Sugestoes de +50 comandos enquanto escreves
- Tab para completar
- Detecao inteligente de buffers

### Monitor de Sistema
- Ring gauges SVG: CPU, RAM, GPU, Disco
- Graficos de historico (60 segundos)
- Barras de uso com cor (verde/amarelo/vermelho)
- Janela destacavel

### Outras
- Hiperligacoes clickaveis no output
- Drag & Drop nativo de ficheiros
- Paleta de comandos estilo VS Code (Ctrl+Shift+P)
- Clipboard nativo via Rust arboard
- PTY nativo com resize dinamico
- Atualizacoes integradas

---

## Atalhos de Teclado

| Atalho | Acao |
|--------|------|
| Ctrl+Shift+N | Nova aba |
| Ctrl+Shift+D | Split Vertical |
| Ctrl+Shift+H | Split Horizontal |
| Ctrl+Shift+S | Abrir/fechar Snippets |
| Ctrl+Shift+P | Paleta de Comandos |
| Ctrl+Shift+K | Criar snippet da selecao |
| Ctrl+, | Abrir/fechar Definicoes |
| Ctrl+C | Copiar selecao / SIGINT |
| Ctrl+V | Colar (clipboard nativo) |
| Ctrl+A | Selecionar tudo |
| Ctrl+L | Limpar ecra |
| Ctrl+F | Pesquisa incremental |
| Tab | Aceitar sugestao (ghost text) |
| Esc | Fechar paineis/paletas |
| Ctrl+Click | Abrir URL no browser |

---

## Stack Tecnologica

| Camada | Tecnologia |
|--------|-----------|
| **Framework** | Tauri v2 |
| **Frontend** | React 19 + TypeScript + Vite 7 |
| **Emulador Terminal** | xterm.js 5 + Addons |
| **Estilos** | Tailwind CSS 4 |
| **Backend** | Rust |
| **Icones** | Google Material Symbols |
| **Clipboard** | Rust arboard v3 |
| **Info Sistema** | sysinfo v0.33 |

---

## Instalacao

Download do instalador mais recente na seccao Releases.

### Requisitos
- **Windows 10** ou superior (64-bit)
- WebView2 Runtime (incluido no Windows 11)

---

## Build

### Pre-requisitos
- Node.js v18+
- Rust (latest stable)
- Visual Studio Build Tools (Desktop development with C++)

### Passos

```bash
git clone https://github.com/ezzo/terminal.git
cd terminal
npm install
npm run tauri dev    # Desenvolvimento
npm run tauri build  # Build producao (.exe)
```

O instalador sera gerado em `src-tauri/target/release/bundle/nsis/`.

---

## Estrutura do Projeto

```
ezzo-terminal/
  src/                  # Frontend React
    App.tsx             # Componente principal
    CommandPalette.tsx  # Paleta de comandos
    SystemMonitor.tsx   # Monitor de sistema
    WelcomeScreen.tsx   # Ecra de boas-vindas
    index.css           # Estilos globais
    assets/             # Assets (logo, etc.)
  src-tauri/            # Backend Rust
    src/
      lib.rs            # Comandos Tauri
      main.rs           # Entry point
    icons/              # Icones da aplicacao
    tauri.conf.json     # Configuracao
    Cargo.toml          # Dependencias Rust
  public/               # Ficheiros estaticos
  scripts/              # Scripts de desenvolvimento
```

---

## Licenca

Este projeto esta licenciado sob a licenca **MIT**.
Copyright © 2026 **EZZO Digital Inc.** — Todos os direitos reservados.

---

<div align="center">
  <sub>Feito com ❤️ pela <strong>EZZO Digital Inc.</strong></sub>
  <br />
  <sub>Angola · 2026</sub>
</div>
