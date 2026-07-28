/**
 * The shared coin wallet. One total, persisted in localStorage, synced across
 * tabs, and mirrored into every `[data-px-coins]` element on the page.
 */

const KEY = "pc-coins";

type Listener = (total: number) => void;

const listeners = new Set<Listener>();

/** localStorage throws in private mode and when storage is disabled */
let fallback = 0;

function read(): number {
  try {
    const raw = Number.parseInt(localStorage.getItem(KEY) ?? "", 10);
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  } catch {
    return fallback;
  }
}

function write(total: number): void {
  fallback = total;
  try {
    localStorage.setItem(KEY, String(total));
  } catch {
    // in-memory only for this session; the wallet still works
  }
  publish(total);
}

function publish(total: number): void {
  for (const el of document.querySelectorAll("[data-px-coins]")) {
    el.textContent = String(total);
  }
  for (const listener of listeners) listener(total);
}

export const coins = {
  get: read,

  /** Award (or with a negative amount, spend) coins. Never drops below zero. */
  add(amount: number): number {
    const total = Math.max(0, read() + amount);
    write(total);
    return total;
  },

  set(total: number): number {
    const next = Math.max(0, Math.trunc(total));
    write(next);
    return next;
  },

  reset(): void {
    write(0);
  },

  /** Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(read());
    return () => listeners.delete(listener);
  },
};

if (typeof window !== "undefined") {
  // another tab spent or earned; mirror it here
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) publish(read());
  });
  document.addEventListener("DOMContentLoaded", () => publish(read()), { once: true });
  if (document.readyState !== "loading") publish(read());
}
