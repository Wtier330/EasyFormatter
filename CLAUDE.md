# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EasyFormatter is a Tauri v2 + Vue 3 desktop application for text/JSON formatting and transformation. Current version: **1.2.0**

## Build Commands

### Frontend (Vue 3 + TypeScript)
```bash
cd ui
npm install           # Install dependencies
npm run dev          # Start Vite dev server (port 1420)
npm run build       # Type check (vue-tsc) + production build → dist/
npx vitest run      # Run unit tests (Vitest)
```

### Backend (Rust)
```bash
cd src-tauri
cargo build          # Debug build
cargo build --release  # Release build
cargo test           # Run all tests (including phase2_tests.rs)
```

### Full Tauri App
```bash
# From project root or ui directory:
npm run tauri dev    # Start full dev mode (auto-starts backend + frontend)
npm run tauri build  # Production build → src-tauri/target/release/bundle/
```

## Architecture

### Backend (`src-tauri/src/`)
- **lib.rs / main.rs**: App entry point, Tauri builder setup, plugin registration
- **core/**: Core business logic
  - `formatter/`: Text transformation pipeline (escape, unescape, Unicode conversion)
  - `json_tools/`: JSON format/minify/sort operations
  - `presets/`: Predefined text cleaning presets
- **commands/**: Tauri command handlers exposed to frontend
- **history/**: Version history system
  - `db.rs`: SQLite database operations
  - `repo.rs`: Repository pattern for history data
  - `models.rs`: Data structures
  - `commands.rs`: History-specific Tauri commands
- **appdirs.rs**: Application data directory initialization

### Frontend (`ui/src/`)
- **stores/**: Pinia state management
  - `app.ts`: Main application state
  - `config.ts`: User configuration
  - `historyWorkspace.ts`: History panel state
- **components/layout/**: AppShell, TabsBar, Toolbar, ActivityBar, StatusBar, Splitter
- **components/editor/**: JsonEditor, SearchWidget
- **components/preview/**: PreviewPanel, JsonTree, JsonNode
- **components/history/**: CompareBar, HistoryTimeline, HistoryWorkbench
- **tauri/index.ts**: Tauri API wrapper (invoke, events, file dialogs, fs operations)
- **composables/**: Vue composables (useKeyboardShortcuts, useGlobalPaste)

### Tauri Integration
- Frontend calls Rust via `invoke<T>(cmd, args)` in `ui/src/tauri/index.ts`
- Events flow from Rust to frontend via `emit`/`listen` (e.g., `open-paths`, `decrypt-log`)
- Single instance support via `tauri-plugin-single-instance`
- Plugins: fs, dialog, shell, clipboard-manager

### History Storage
- SQLite database at app data directory
- **Snapshots** (`is_checkpoint=1`): stored as plaintext (`codec='none'`) with pretty-printed content
- **Patches** (`is_checkpoint=0`): stored as zstd-compressed JSON patches (`codec='zstd'`)
- `op_meta` JSON field stores metadata: `payload_format`, `hash_algo`, `hash_basis`, `indent`

## UI Layout Principles

- **Editor-first**: Monaco Editor occupies primary screen space
- **Frameless window**: Custom title bar via `decorations: false` in tauri.conf.json
- **Configuration subordinate**: Sidebars and settings panels are collapsible
- Toast messages use 48px top margin to avoid custom title bar

## Key Conventions

- All code comments in Chinese
- SemVer versioning for package.json and tauri.conf.json
- JSON operations preserve key order (`serde_json::preserve_order`)
- Frontend Monaco Editor language workers configured for JSON only
