/**
 * Journal — private free-write overlay (DOM textarea over the canvas).
 * Persistence: localStorage key only. No network, analytics, or text logging.
 */

import type { Input } from '@/core/Input';

export const JOURNAL_STORAGE_KEY = 'novgorod1995:journal';

const AUTOSAVE_MS = 450;
const STYLE_ID = 'novgorod-journal-style';

export interface JournalCloseResult {
  hadText: boolean;
}

export interface JournalOpenOptions {
  /** Disables game Input while the overlay is open. */
  input?: Input | null;
  /** Optional title above the textarea. */
  title?: string;
  onClose?: (result: JournalCloseResult) => void;
}

let root: HTMLDivElement | null = null;
let textarea: HTMLTextAreaElement | null = null;
let open = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let boundInput: Input | null = null;
let closeResolver: ((r: JournalCloseResult) => void) | null = null;
let onCloseCb: ((r: JournalCloseResult) => void) | null = null;

export function isJournalOpen(): boolean {
  return open;
}

/** Whether the DOM overlay can be mounted. */
export function isJournalAvailable(): boolean {
  try {
    return typeof document !== 'undefined' && !!document.body;
  } catch {
    return false;
  }
}

/**
 * Finale / external safe entry: open the journal, or skip without throwing.
 * Returns `'skipped'` when the overlay cannot mount.
 */
export async function tryOpenJournal(
  opts: JournalOpenOptions = {},
): Promise<'opened' | 'skipped'> {
  try {
    if (!isJournalAvailable()) return 'skipped';
    await openJournal(opts);
    return 'opened';
  } catch {
    return 'skipped';
  }
}

/** Force-close if open (scene exit). Autosaves; does not throw. */
export function closeJournalIfOpen(): void {
  try {
    if (open) closeJournal();
  } catch {
    /* ignore */
  }
}

/**
 * Open the journal overlay. Resolves when the player saves & closes.
 * If already open, returns a promise that resolves with the current session.
 */
export function openJournal(opts: JournalOpenOptions = {}): Promise<JournalCloseResult> {
  if (open && closeResolver) {
    return new Promise<JournalCloseResult>((resolve) => {
      const prev = onCloseCb;
      onCloseCb = (r) => {
        prev?.(r);
        opts.onClose?.(r);
        resolve(r);
      };
    });
  }

  ensureStyles();
  const mount = ensureRoot();
  if (!mount || !textarea) {
    return Promise.resolve({ hadText: false });
  }

  open = true;
  boundInput = opts.input ?? null;
  boundInput?.setEnabled(false);
  onCloseCb = opts.onClose ?? null;

  const titleEl = mount.querySelector('.nj-title');
  if (titleEl) titleEl.textContent = opts.title ?? 'Журнал';

  textarea.value = loadText();
  mount.hidden = false;
  mount.setAttribute('aria-hidden', 'false');
  // Defer focus so the interact key that opened us does not leak into the field.
  window.setTimeout(() => {
    textarea?.focus();
  }, 0);

  return new Promise<JournalCloseResult>((resolve) => {
    closeResolver = resolve;
  });
}

function loadText(): string {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    return typeof raw === 'string' ? raw : '';
  } catch {
    return '';
  }
}

function persistText(value: string): void {
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, value);
  } catch {
    /* storage blocked / full — writing still works in-session */
  }
}

function scheduleAutosave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (textarea) persistText(textarea.value);
  }, AUTOSAVE_MS);
}

function flushAutosave(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (textarea) persistText(textarea.value);
}

function closeJournal(): void {
  if (!open) return;
  flushAutosave();
  const text = textarea?.value ?? '';
  const hadText = text.trim().length > 0;
  const result: JournalCloseResult = { hadText };

  open = false;
  if (root) {
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
  }
  boundInput?.setEnabled(true);
  boundInput = null;

  const resolve = closeResolver;
  const cb = onCloseCb;
  closeResolver = null;
  onCloseCb = null;
  resolve?.(result);
  cb?.(result);
}

function downloadTxt(): void {
  flushAutosave();
  const text = textarea?.value ?? '';
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'journal.txt';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    /* download unavailable — ignore */
  }
}

function clearWithConfirm(): void {
  const ok = window.confirm('Очистить запись?');
  if (!ok || !textarea) return;
  textarea.value = '';
  persistText('');
  textarea.focus();
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#novgorod-journal {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right))
    max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  background: rgba(8, 6, 10, 0.72);
  -webkit-user-select: text;
  user-select: text;
  touch-action: auto;
}
#novgorod-journal[hidden] {
  display: none !important;
}
#novgorod-journal .nj-panel {
  width: min(920px, 96vw);
  height: min(78vh, 640px);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 16px 14px;
  background: linear-gradient(165deg, #2a241c 0%, #1a1612 55%, #12100e 100%);
  border: 1px solid rgba(200, 168, 96, 0.55);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.55), 0 18px 48px rgba(0, 0, 0, 0.55);
}
#novgorod-journal .nj-title {
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  font-size: clamp(1.15rem, 2.4vw, 1.55rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #f0e2c0;
}
#novgorod-journal textarea {
  flex: 1 1 auto;
  width: 100%;
  min-height: 12rem;
  resize: none;
  border: 1px solid rgba(160, 140, 100, 0.45);
  border-radius: 0;
  padding: 14px 16px;
  background: #f4ead4;
  color: #1c1812;
  caret-color: #3a3020;
  font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  font-size: clamp(1.15rem, 2.6vw, 1.45rem);
  line-height: 1.55;
  outline: none;
  -webkit-user-select: text;
  user-select: text;
}
#novgorod-journal textarea:focus {
  border-color: rgba(200, 168, 96, 0.85);
  box-shadow: inset 0 0 0 1px rgba(200, 168, 96, 0.35);
}
#novgorod-journal .nj-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
#novgorod-journal .nj-actions button {
  appearance: none;
  border: 1px solid rgba(200, 168, 96, 0.55);
  background: #2e281e;
  color: #f4ead4;
  font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: clamp(0.95rem, 2vw, 1.05rem);
  font-weight: 600;
  padding: 0.55rem 0.9rem;
  cursor: pointer;
  touch-action: manipulation;
}
#novgorod-journal .nj-actions button:hover,
#novgorod-journal .nj-actions button:focus-visible {
  background: #3a3226;
  border-color: rgba(230, 200, 120, 0.9);
  outline: none;
}
#novgorod-journal .nj-actions button.nj-primary {
  background: #4a3a22;
  border-color: rgba(230, 190, 100, 0.85);
}
#novgorod-journal .nj-actions button.nj-danger {
  border-color: rgba(180, 100, 80, 0.65);
  color: #f0d0c0;
}
`;
  document.head.appendChild(style);
}

function ensureRoot(): HTMLDivElement | null {
  if (root && textarea) return root;
  try {
    const el = document.createElement('div');
    el.id = 'novgorod-journal';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="nj-panel">
        <div class="nj-title">Журнал</div>
        <textarea spellcheck="true" autocomplete="off" autocapitalize="sentences" aria-label="Журнал"></textarea>
        <div class="nj-actions">
          <button type="button" class="nj-primary" data-act="save">Сохранить и закрыть</button>
          <button type="button" data-act="download">Скачать .txt</button>
          <button type="button" class="nj-danger" data-act="clear">Очистить</button>
        </div>
      </div>
    `;
    const ta = el.querySelector('textarea');
    if (!(ta instanceof HTMLTextAreaElement)) return null;
    textarea = ta;
    ta.addEventListener('input', () => scheduleAutosave());
    // Keep game key handlers from eating Space / arrows while typing.
    ta.addEventListener('keydown', (e) => e.stopPropagation());
    ta.addEventListener('keyup', (e) => e.stopPropagation());
    el.querySelector('[data-act="save"]')?.addEventListener('click', () => closeJournal());
    el.querySelector('[data-act="download"]')?.addEventListener('click', () => downloadTxt());
    el.querySelector('[data-act="clear"]')?.addEventListener('click', () => clearWithConfirm());
    document.body.appendChild(el);
    root = el;
    return root;
  } catch {
    root = null;
    textarea = null;
    return null;
  }
}
