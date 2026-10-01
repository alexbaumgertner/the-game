# Novgorod 1995

TypeScript + Vite + HTML5 Canvas 2D arcade brawler/platformer.

Pixel-crisp 320×180 internal resolution, modular entity/systems architecture.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

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
  core/       GameLoop, StateManager
  entities/   Player, Gangster
  systems/    DialogueSystem
  ui/         HUD
  main.ts     Bootstrap + canvas wiring
```

See the project blueprint for phased build plan.
