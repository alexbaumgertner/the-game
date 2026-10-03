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
| `npm run build:gh` | Production build with `base: /novgorod-1995/` (GitHub project Pages) |
| `npm run preview` | Serve the production build       |
| `npm run typecheck` | TypeScript only (`tsc --noEmit`) |

## GitHub Pages

Live site: https://alexbaumgertner.github.io/the-game/

**Agent / workflow rule:** if local `npm run build` (and tests, when present) pass, push `main` to both remotes — do not wait for a manual sync request:

```bash
git push origin main
git push github main   # → alexbaumgertner/the-game (Actions deploys Pages)
```

Repo **Settings → Pages → Source: GitHub Actions**. See project doc `github-pages-deploy.md` for `VITE_BASE` / URL patterns. Cursor rule: `.cursor/rules/github-pages-push.mdc`.

## Layout

```
src/
  art/        Palettes, sprites, pixel helpers, bitmap font
  core/       GameLoop, StateManager, Input (+ virtual/touch)
  entities/   Player, Gangster, BazarBubble
  scenes/     Apartment2026, Rynok1995, Podezd1995
  systems/    DialogueSystem, CombatMath
  ui/         HUD, TouchControls
  main.ts     Bootstrap — GameLoop → StateManager
```

**Levels:** Diary Level Select — Level 1 (рынok) always; Level 2 (подъезд №7) unlocks after Level 1 clear (`level1Cleared`). See project doc `level2-podezd.md`.

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

