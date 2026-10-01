# Novgorod 1995

TypeScript + Vite + HTML5 Canvas 2D arcade brawler/platformer.

Pixel-crisp 320×224 Genesis-like internal resolution, modular entity/systems architecture.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

**Phase 3:** After diary → rynok, fight thugs with punch/kick, fill Street Swagger, fire Bazar slang stuns. Mental Fortitude at 0 returns you to the apartment. See project docs `phase3-combat-bazar.md`.

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
  entities/   Player, Gangster, BazarBubble
  scenes/     Apartment2026, Rynok1995
  systems/    DialogueSystem, CombatMath
  ui/         HUD
  main.ts     Bootstrap — GameLoop → StateManager
```

**Art:** Sega Genesis / Mega Drive 16-bit pass (procedural pixels). See project docs `sega-16bit-art.md`.

## Controls

| Input | Action |
|-------|--------|
| Arrows / WASD | Move |
| Space / ↑ / W | Jump (1995) |
| J / Z | Punch |
| K / X | Kick |
| L / C / F | Bazar special |
| E | Interact |
| Enter | Confirm |
| P / Esc | Pause |

