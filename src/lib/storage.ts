/* Lokale Speicherung. Alles bleibt im Browser; ohne Speicher (privates Fenster) läuft die App weiter. */
import { useSyncExternalStore } from 'react';

const NS = 'klangwandel.v1.';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* Speicher voll oder gesperrt – stillschweigend im Speicher weiterarbeiten */
  }
}

/** Kleiner reaktiver Speicher je Schlüssel. */
function createStore<T>(key: string, fallback: T) {
  let value = read<T>(key, fallback);
  const listeners = new Set<() => void>();
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  const set = (next: T) => {
    value = next;
    write(key, next);
    listeners.forEach((l) => l());
  };
  // Änderungen aus anderen Tabs übernehmen
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === NS + key) {
        value = read<T>(key, fallback);
        listeners.forEach((l) => l());
      }
    });
  }
  return { get: () => value, set, subscribe };
}

/* ---------- Entdeckungen („Das möchte ich später noch einmal hören“) ---------- */

export interface Favorite {
  stationId: string;
  at: number;
}

const favStore = createStore<Favorite[]>('favorites', []);

export const useFavorites = () => useSyncExternalStore(favStore.subscribe, favStore.get, favStore.get);

export function toggleFavorite(stationId: string) {
  const list = favStore.get();
  if (list.some((f) => f.stationId === stationId)) {
    favStore.set(list.filter((f) => f.stationId !== stationId));
  } else {
    favStore.set([...list, { stationId, at: Date.now() }]);
  }
}

export function clearFavorites() {
  favStore.set([]);
}

/* ---------- Besuchte Stationen ---------- */

const visitedStore = createStore<string[]>('visited', []);
export const useVisited = () => useSyncExternalStore(visitedStore.subscribe, visitedStore.get, visitedStore.get);
export function markVisited(stationId: string) {
  const list = visitedStore.get();
  if (!list.includes(stationId)) visitedStore.set([...list, stationId]);
}
export function resetVisited() {
  visitedStore.set([]);
}

/* ---------- Letzte Station (Weiterreisen) ---------- */

const lastStore = createStore<string | null>('last', null);
export const useLastStation = () => useSyncExternalStore(lastStore.subscribe, lastStore.get, lastStore.get);
export const setLastStation = (id: string) => lastStore.set(id);
