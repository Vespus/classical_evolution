/*
 * Audio-Engine.
 *
 * Grundregeln:
 *  - Es klingt immer höchstens eine Quelle (Aufnahme oder Synthesizer-Demo).
 *  - Nichts startet von selbst; Wiedergabe beginnt nur durch eine Nutzerhandlung.
 *  - Ausschnitte sind kleine, vorab geschnittene Dateien (start = 0). Die Engine
 *    kennt trotzdem start/end, damit auch „ganzer Satz“ aus dem Netz im selben
 *    Player läuft.
 *  - A/B-Wechsel sind nahtlos, weil beide Elemente vorgeladen bleiben.
 */
import { useSyncExternalStore } from 'react';

export interface Track {
  id: string;
  src: string;
  title: string;
  subtitle: string;
  /** Sekunden in der Datei */
  start: number;
  /** Sekunden in der Datei; undefiniert = bis zum Dateiende */
  end?: number;
  /** Nur für die Anzeige */
  kind: 'clip' | 'full';
  /** Alternativer Link, falls die Datei nicht ladbar ist */
  fallbackUrl?: string;
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface PlayerState {
  track: Track | null;
  status: PlayerStatus;
  error: string | null;
}

export interface PlayerTime {
  /** Position relativ zum Beginn des Ausschnitts */
  pos: number;
  /** Länge des Ausschnitts (0, solange unbekannt) */
  dur: number;
}

/* ---------- Audio-Fokus: Player und Synth schließen sich gegenseitig aus ---------- */

const stoppers = new Map<string, () => void>();
export function registerAudioOwner(name: string, stop: () => void) {
  stoppers.set(name, stop);
}
export function claimAudio(owner: string) {
  stoppers.forEach((stop, name) => {
    if (name !== owner) stop();
  });
}

/* ---------- Zustand ---------- */

let state: PlayerState = { track: null, status: 'idle', error: null };
let time: PlayerTime = { pos: 0, dur: 0 };
const stateListeners = new Set<() => void>();
const timeListeners = new Set<() => void>();

function setState(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  stateListeners.forEach((l) => l());
}
function setTime(next: PlayerTime) {
  if (next.pos === time.pos && next.dur === time.dur) return;
  time = next;
  timeListeners.forEach((l) => l());
}

const subState = (cb: () => void) => {
  stateListeners.add(cb);
  return () => stateListeners.delete(cb);
};
const subTime = (cb: () => void) => {
  timeListeners.add(cb);
  return () => timeListeners.delete(cb);
};

export const usePlayerState = () => useSyncExternalStore(subState, () => state, () => state);
export const usePlayerTime = () => useSyncExternalStore(subTime, () => time, () => time);

/* ---------- Elemente ---------- */

const pool = new Map<string, HTMLAudioElement>();
const POOL_MAX = 14;
let raf = 0;
let fadeTimer = 0;

function elementFor(track: Track): HTMLAudioElement {
  let el = pool.get(track.id);
  if (el && el.dataset.src === track.src) {
    // LRU: ans Ende schieben
    pool.delete(track.id);
    pool.set(track.id, el);
    return el;
  }
  el = new Audio();
  el.preload = 'auto';
  el.dataset.src = track.src;
  el.src = track.src;
  pool.set(track.id, el);
  attach(el, track.id);
  // Pool begrenzen – nie das laufende Element entfernen
  if (pool.size > POOL_MAX) {
    for (const [key, candidate] of pool) {
      if (key !== state.track?.id && candidate !== el) {
        candidate.removeAttribute('src');
        candidate.load();
        pool.delete(key);
        break;
      }
    }
  }
  return el;
}

function attach(el: HTMLAudioElement, id: string) {
  const isCurrent = () => state.track?.id === id;
  el.addEventListener('error', () => {
    if (!isCurrent()) return;
    cancelAnimationFrame(raf);
    setState({
      status: 'error',
      error: 'Diese Aufnahme lässt sich gerade nicht laden. Bitte Verbindung prüfen und erneut versuchen.',
    });
  });
  el.addEventListener('waiting', () => {
    if (isCurrent() && state.status === 'playing') setState({ status: 'loading' });
  });
  el.addEventListener('playing', () => {
    if (isCurrent() && state.status !== 'paused') setState({ status: 'playing', error: null });
  });
  el.addEventListener('loadedmetadata', () => {
    if (isCurrent()) syncTime(el);
  });
  el.addEventListener('ended', () => {
    if (isCurrent()) finish(el);
  });
}

function bounds(el: HTMLAudioElement, track: Track) {
  const fileDur = Number.isFinite(el.duration) ? el.duration : 0;
  const end = track.end !== undefined ? Math.min(track.end, fileDur || track.end) : fileDur;
  return { start: track.start, end };
}

function syncTime(el: HTMLAudioElement) {
  const track = state.track;
  if (!track) return;
  const { start, end } = bounds(el, track);
  const dur = Math.max(0, end - start);
  const pos = Math.min(dur, Math.max(0, el.currentTime - start));
  setTime({ pos: Math.round(pos * 20) / 20, dur: Math.round(dur * 20) / 20 });
}

function loop() {
  const track = state.track;
  const el = track ? pool.get(track.id) : undefined;
  if (!track || !el) return;
  syncTime(el);
  const { end } = bounds(el, track);
  if (end > 0 && el.currentTime >= end - 0.02) {
    finish(el);
    return;
  }
  // Künstlich gekürzte Ausschnitte (Zeitraffer) blenden kurz vor ihrem Ende aus
  if (track.end !== undefined && end - el.currentTime < 0.4) el.volume = Math.max(0, (end - el.currentTime) / 0.4);
  if (state.status === 'playing' || state.status === 'loading') raf = requestAnimationFrame(loop);
}

function finish(el: HTMLAudioElement) {
  cancelAnimationFrame(raf);
  el.pause();
  el.volume = 1;
  setState({ status: 'ended' });
  const track = state.track;
  if (track) {
    const { start, end } = bounds(el, track);
    setTime({ pos: Math.max(0, end - start), dur: Math.max(0, end - start) });
  }
}

function fade(el: HTMLAudioElement, from: number, to: number, ms: number, done?: () => void) {
  window.clearInterval(fadeTimer);
  const steps = Math.max(1, Math.round(ms / 20));
  let i = 0;
  el.volume = from;
  fadeTimer = window.setInterval(() => {
    i += 1;
    const v = from + ((to - from) * i) / steps;
    el.volume = Math.min(1, Math.max(0, v));
    if (i >= steps) {
      window.clearInterval(fadeTimer);
      done?.();
    }
  }, 20);
}

/* ---------- Öffentliche API ---------- */

/** Lädt eine Aufnahme im Hintergrund vor (kein Ton). */
export function preload(track: Track) {
  elementFor(track);
}

function pauseOthers(keepId?: string) {
  pool.forEach((el, id) => {
    if (id !== keepId && !el.paused) el.pause();
  });
}

export function play(track: Track) {
  claimAudio('player');
  cancelAnimationFrame(raf);
  window.clearInterval(fadeTimer);
  pauseOthers(track.id);

  const el = elementFor(track);
  const same = state.track?.id === track.id;
  // Nur ein pausierter Titel macht dort weiter, wo er stand; alles andere beginnt am kuratierten Anfang.
  const resume = same && state.status === 'paused';
  if (el.error) el.load();

  setState({ track, status: 'loading', error: null });
  updateMediaSession(track);

  const begin = () => {
    if (state.track?.id !== track.id) return;
    if (!resume) el.currentTime = track.start;
    syncTime(el);
    el.volume = 0;
    const p = el.play();
    p?.then(() => {
      if (state.track?.id !== track.id) return;
      if (state.status === 'paused') {
        el.pause();
        return;
      }
      fade(el, 0, 1, 160);
      raf = requestAnimationFrame(loop);
      if (el.readyState >= 3) setState({ status: 'playing' });
    }).catch((err: DOMException) => {
      if (err?.name === 'AbortError') return; // durch schnellen Wechsel unterbrochen
      if (state.track?.id !== track.id) return;
      setState({
        status: 'error',
        error:
          err?.name === 'NotAllowedError'
            ? 'Der Browser hat die Wiedergabe blockiert. Bitte noch einmal auf „Hören“ drücken.'
            : 'Diese Aufnahme lässt sich gerade nicht abspielen.',
      });
    });
  };

  if (el.readyState >= 1) begin();
  else {
    el.addEventListener('loadedmetadata', begin, { once: true });
    if (el.error || el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) el.load();
  }
}

export function pause() {
  const track = state.track;
  if (!track) return;
  const el = pool.get(track.id);
  if (!el) return;
  cancelAnimationFrame(raf);
  if (state.status === 'playing' || state.status === 'loading') {
    setState({ status: 'paused' });
    fade(el, el.volume, 0, 90, () => el.pause());
  }
}

export function toggle(track: Track) {
  if (state.track?.id === track.id) {
    if (state.status === 'playing' || state.status === 'loading') return pause();
    return play(track);
  }
  play(track);
}

export function stop() {
  const track = state.track;
  cancelAnimationFrame(raf);
  window.clearInterval(fadeTimer);
  pool.forEach((el) => el.pause());
  if (track) setState({ status: 'paused' });
}

export function seek(fraction: number) {
  const track = state.track;
  if (!track) return;
  const el = pool.get(track.id);
  if (!el) return;
  const { start, end } = bounds(el, track);
  const t = start + Math.min(1, Math.max(0, fraction)) * Math.max(0, end - start);
  el.currentTime = Math.min(t, end - 0.05);
  if (state.status === 'ended') setState({ status: 'paused' });
  syncTime(el);
}

export function isPlayingTrack(id: string) {
  return state.track?.id === id && (state.status === 'playing' || state.status === 'loading');
}

registerAudioOwner('player', () => {
  if (state.status === 'playing' || state.status === 'loading') stop();
});

/* ---------- Media Session (Sperrbildschirm, Kopfhörertasten) ---------- */

function updateMediaSession(track: Track) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: track.title, artist: track.subtitle, album: 'Klangwandel' });
    navigator.mediaSession.setActionHandler('play', () => state.track && play(state.track));
    navigator.mediaSession.setActionHandler('pause', () => pause());
  } catch {
    /* nicht kritisch */
  }
}

export function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
