/*
 * Kleiner Synthesizer für die Mini-Beispiele („Was höre ich da eigentlich?“).
 * Alles wird live erzeugt – keine Aufnahmen, keine Lizenzfragen. Jede Demo ruft
 * claimAudio('synth'), damit nie Aufnahme und Synth zugleich klingen.
 */
import { claimAudio, registerAudioOwner } from './audio';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const live = new Set<{ stop: (t?: number) => void }>();
const timers = new Set<number>();
let stopListeners = new Set<() => void>();

export function audioCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export type Timbre = number[]; // Obertonamplituden ab Grundton

export const TIMBRES: Record<string, Timbre> = {
  weich: [1, 0.25, 0.06, 0.02],
  hell: [1, 0.7, 0.55, 0.45, 0.35, 0.25, 0.2, 0.12],
  scharf: [1, 0.9, 0.85, 0.75, 0.7, 0.6, 0.55, 0.5, 0.4, 0.35, 0.3, 0.25],
  hohl: [1, 0, 0.5, 0, 0.3, 0, 0.18, 0, 0.1],
};

export interface NoteOpts {
  when?: number; // Sekunden ab jetzt
  dur?: number;
  vel?: number;
  timbre?: Timbre;
  attack?: number;
  release?: number;
}

/** Eine Note; gibt Handle zum frühzeitigen Beenden zurück. */
export function note(midi: number | number[], opts: NoteOpts = {}) {
  const c = audioCtx();
  const { when = 0, dur = 0.5, vel = 0.5, timbre = TIMBRES.weich, attack = 0.015, release = 0.12 } = opts;
  const t0 = c.currentTime + when + 0.02;
  const freqs = Array.isArray(midi) ? midi.map(mtof) : [mtof(midi)];
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vel / Math.sqrt(freqs.length), t0 + attack);
  g.gain.setTargetAtTime(vel / Math.sqrt(freqs.length) * 0.7, t0 + attack, dur * 0.6);
  g.gain.setTargetAtTime(0, t0 + dur, release / 3);
  g.connect(master!);
  const real = new Float32Array(timbre.length + 1);
  const imag = new Float32Array(timbre.length + 1);
  timbre.forEach((a, i) => (imag[i + 1] = a));
  const wave = c.createPeriodicWave(real, imag);
  const oscs = freqs.map((f) => {
    const o = c.createOscillator();
    o.setPeriodicWave(wave);
    o.frequency.value = f;
    o.connect(g);
    o.start(t0);
    o.stop(t0 + dur + release * 2);
    return o;
  });
  const handle = {
    stop: (t = 0.05) => {
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(0, now, t / 3);
      oscs.forEach((o) => {
        try {
          o.stop(now + t * 2);
        } catch {
          /* bereits beendet */
        }
      });
      live.delete(handle);
    },
  };
  live.add(handle);
  oscs[0].onended = () => live.delete(handle);
  return handle;
}

/** Dauerton, dessen Frequenzen später verändert werden können. */
export function drone(freqs: number[], timbre: Timbre = TIMBRES.weich, vel = 0.4) {
  const c = audioCtx();
  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(vel / Math.sqrt(freqs.length), c.currentTime + 0.12);
  g.connect(master!);
  const real = new Float32Array(timbre.length + 1);
  const imag = new Float32Array(timbre.length + 1);
  timbre.forEach((a, i) => (imag[i + 1] = a));
  const wave = c.createPeriodicWave(real, imag);
  const oscs = freqs.map((f) => {
    const o = c.createOscillator();
    o.setPeriodicWave(wave);
    o.frequency.value = f;
    o.connect(g);
    o.start();
    return o;
  });
  const handle = {
    set: (i: number, f: number) => oscs[i]?.frequency.setTargetAtTime(f, c.currentTime, 0.03),
    stop: () => {
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(0, now, 0.05);
      oscs.forEach((o) => {
        try {
          o.stop(now + 0.3);
        } catch {
          /* */
        }
      });
      live.delete(handle);
    },
  };
  live.add(handle);
  return handle;
}

/** Sequenz abspielen; onStep wird zur jeweiligen Zeit aufgerufen (für die Anzeige). */
export function sequence(
  steps: { m: number | number[] | null; d: number; v?: number }[],
  opts: { tempo?: number; timbre?: Timbre; onStep?: (i: number) => void; onEnd?: () => void; gap?: number } = {},
) {
  claimAudio('synth');
  const { tempo = 1, timbre = TIMBRES.weich, onStep, onEnd, gap = 0.9 } = opts;
  let t = 0;
  steps.forEach((s, i) => {
    const dur = s.d / tempo;
    if (s.m !== null) note(s.m, { when: t, dur: dur * gap, vel: s.v ?? 0.5, timbre });
    const id = window.setTimeout(() => {
      timers.delete(id);
      onStep?.(i);
    }, t * 1000);
    timers.add(id);
    t += dur;
  });
  const endId = window.setTimeout(() => {
    timers.delete(endId);
    onEnd?.();
  }, t * 1000 + 150);
  timers.add(endId);
  return t;
}

export function stopSynth() {
  timers.forEach((t) => window.clearTimeout(t));
  timers.clear();
  live.forEach((h) => h.stop(0.05));
  live.clear();
  stopListeners.forEach((l) => l());
}

export function onSynthStop(cb: () => void) {
  stopListeners.add(cb);
  return () => void stopListeners.delete(cb);
}

export function claimSynth() {
  claimAudio('synth');
}

registerAudioOwner('synth', stopSynth);

// Beim Verlassen der Seite aufräumen
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => stopSynth());
  stopListeners = new Set();
}
