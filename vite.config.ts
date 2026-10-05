import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { novgorodPwaPrecache } from './scripts/pwa-precache-plugin';

/**
 * GitHub project Pages need `/${repo}/`. Override with `VITE_BASE=/` for
 * user/org Pages or a custom domain. Always ends with a trailing slash
 * (except Vite's special `./` relative mode).
 */
function resolveBase(): string {
  const raw = (process.env.VITE_BASE ?? '/the-game/').trim() || '/the-game/';
  if (raw === './') return raw;
  return raw.endsWith('/') ? raw : `${raw}/`;
}

export default defineConfig({
  base: resolveBase(),
  plugins: [novgorodPwaPrecache()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
