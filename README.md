# Novgorod 1995

TypeScript + Vite + HTML5 Canvas 2D arcade brawler/platformer.

Pixel-crisp **640×448** internal buffer (2× logical Genesis **320×224**), DPR-aware Hi-DPI canvas, modular entity/systems architecture. See project doc `hi-dpi-display.md`.

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
| `npm run build:gh` | Production build with `base: /the-game/` (GitHub project Pages) |
| `npm run preview` | Serve the production build       |
| `npm run typecheck` | TypeScript only (`tsc --noEmit`) |

## GitHub Pages

Live site: https://alexbaumgertner.github.io/the-game/

Deploy runs from GitHub Actions when `main` changes. **Nobody pushes to `main` directly:** work on a branch, make `npm run typecheck` and `npm run build` pass, open a PR, and the owner merges it after review.

Default Vite `base` is `/the-game/` (override with `VITE_BASE`, e.g. `VITE_BASE=/ npm run build` for a custom domain).

Repo **Settings → Pages → Source: GitHub Actions**. See project doc `github-pages-deploy.md` for `VITE_BASE` / URL patterns. Agent rules: `.cursor/rules/branch-and-pr.mdc`.

## Layout

```
src/
  art/        Palettes, sprites, pixel helpers, bitmap font
  core/       GameLoop, StateManager, Input (+ virtual/touch)
  entities/   Player, Gangster, BazarBubble
  scenes/     Apartment2026, Rynok1995, Podezd1995, Vokzal1995, Garazhi1995,
              Dvor1995, Most1995, Diskoteka1995, Detinets1995
  systems/    DialogueSystem, CombatMath, BeerSystem
  ui/         HUD, TouchControls
  main.ts     Bootstrap — GameLoop → StateManager
```

**Levels:** Diary Level Select — L1 рынок → L2 подъезд → L3 вокзал → L4 гаражи → L5 двор/крыша → L6 мост/Волхов → L7 дискотека «Орбита» → L8 детинец (unlock chain via clear flags). See project docs `level2-podezd.md`, `levels-3-5.md`, `levels-6-8.md`.

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
| 1 / 2 | Dialogue choices |
| P / Esc | Pause |

**Mobile / touch:** on-screen D-pad + action buttons appear on coarse-pointer / touch / narrow screens (or tap **SHOW PAD**). See project doc `mobile-controls.md`.

