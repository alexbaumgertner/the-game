/**
 * Production-only service worker registration.
 * Dev keeps HMR unrestricted; preview/build use the hashed precache SW.
 */

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  const swUrl = `${import.meta.env.BASE_URL}sw.js`;
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(swUrl).catch(() => {
      /* registration failure must not break the game */
    });
  });
}
