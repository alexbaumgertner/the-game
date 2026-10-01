# Novgorod 1995

TypeScript + Vite + HTML5 Canvas 2D arcade brawler/platformer.

Pixel-crisp 320×224 Genesis-like internal resolution, modular entity/systems architecture.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

**Phase 2:** Explore the 2026 apartment → find the key → inspect the photo → open the Diary → Level 1 fades into Winter 1995 rynok. See project docs `phase2-eras.md` for controls and architecture.

## Scripts

| Command           | Purpose                          |
|-------------------|----------------------------------|
| `npm run dev`     | Vite dev server with HMR         |
| `npm run build`   | Typecheck + production bundle    |
| `npm run preview` | Serve the production build       |
| `npm run typecheck` | TypeScript only (`tsc --noEmit`) |

## Layout

```
src/
  art/        Palettes, sprites, pixel helpers, bitmap font
  core/       GameLoop, StateManager, Input
  entities/   Player, Gangster
  scenes/     Apartment2026, Rynok1995
  systems/    DialogueSystem
  ui/         HUD
  main.ts     Bootstrap — GameLoop → StateManager
```

**Art:** Sega Genesis / Mega Drive 16-bit pass (procedural pixels). See project docs `sega-16bit-art.md`.
## Controls (Phase 2)

| Input | Action |
|-------|--------|
| Arrows / WASD | Move |
| E | Interact |
| Enter | Confirm |
| P / Esc | Pause |
