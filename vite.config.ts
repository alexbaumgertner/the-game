import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * GitHub project Pages need `/${repo}/`. Override with `VITE_BASE=/` for
 * user/org Pages or a custom domain. Always ends with a trailing slash
 * (except Vite's special `./` relative mode).
 */
function resolveBase(): string {
  const raw = (process.env.VITE_BASE ?? '/novgorod-1995/').trim() || '/novgorod-1995/';
  if (raw === './') return raw;
  return raw.endsWith('/') ? raw : `${raw}/`;
}

export default defineConfig({
  base: resolveBase(),
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
});
