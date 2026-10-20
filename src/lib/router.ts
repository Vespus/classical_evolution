/* Minimaler Hash-Router: funktioniert ohne Serverkonfiguration und per file://. */
import { useEffect, useSyncExternalStore } from 'react';

function currentPath(): string {
  const raw = window.location.hash.replace(/^#/, '');
  return raw === '' ? '/' : raw.split('?')[0];
}

let path = typeof window !== 'undefined' ? currentPath() : '/';
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    path = currentPath();
    listeners.forEach((l) => l());
  });
}

export const usePath = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => path,
    () => '/',
  );

export function navigate(to: string) {
  if (window.location.hash !== '#' + to) window.location.hash = to;
}

export function href(to: string) {
  return '#' + to;
}

/** Springt beim Routenwechsel nach oben, sofern der Zielbereich es nicht selbst regelt. */
export function useScrollReset(key: string, enabled = true) {
  useEffect(() => {
    if (enabled) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [key, enabled]);
}
