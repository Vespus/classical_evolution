import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audioCtx, claimSynth, drone, mtof, note, onSynthStop, sequence, stopSynth, TIMBRES } from '../lib/synth';
import { PauseIcon, PlayIcon } from './Icons';

/* ---------- gemeinsame Bausteine ---------- */

function usePlaying() {
  const [playing, setPlaying] = useState(false);
  useEffect(() => onSynthStop(() => setPlaying(false)), []);
  return [playing, setPlaying] as const;
}

function PlayBtn({ playing, onClick, children, ghost }: { playing?: boolean; onClick: () => void; children: React.ReactNode; ghost?: boolean }) {
  return (
    <button type="button" className={`chip chip--play ${ghost ? '' : 'chip--solid'}`} onClick={onClick} aria-pressed={playing}>
      {playing ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
      {children}
    </button>
  );
}

const ODE: [number, number][] = [
  [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1],
  [60, 1], [60, 1], [62, 1], [64, 1], [64, 1.5], [62, 0.5], [62, 2],
];
const BEAT = 0.46;

/* ---------- Melodie ---------- */

export function MelodieDemo() {
  const [flip, setFlip] = useState(false);
  const [playing, setPlaying] = usePlaying();
  const [now, setNow] = useState(-1);
  const pitches = ODE.map(([m]) => (flip ? 128 - m : m));
  const lo = Math.min(...pitches) - 1;
  const hi = Math.max(...pitches) + 1;
  const W = 300;
  const H = 110;
  const xs = (i: number) => 12 + (i / (ODE.length - 1)) * (W - 24);
  const ys = (m: number) => H - 10 - ((m - lo) / (hi - lo)) * (H - 20);

  const run = () => {
    if (playing) return stopSynth();
    setPlaying(true);
    sequence(
      ODE.map(([, d], i) => ({ m: pitches[i], d: d * BEAT })),
      { onStep: setNow, onEnd: () => { setPlaying(false); setNow(-1); } },
    );
  };

  return (
    <div className="demo">
      <svg viewBox={`0 0 ${W} ${H}`} className="demo-svg" role="img" aria-label="Tonhöhenverlauf der Melodie als Punktelinie">
        <polyline fill="none" className="demo-line" points={pitches.map((m, i) => `${xs(i)},${ys(m)}`).join(' ')} />
        {pitches.map((m, i) => (
          <circle key={i} cx={xs(i)} cy={ys(m)} r={i === now ? 7 : 4.5} className={i === now ? 'demo-dot is-now' : 'demo-dot'} />
        ))}
      </svg>
      <div className="demo-row">
        <PlayBtn playing={playing} onClick={run}>{playing ? 'Anhalten' : 'Melodie hören'}</PlayBtn>
        <label className="demo-toggle">
          <input type="checkbox" checked={flip} onChange={(e) => { stopSynth(); setFlip(e.target.checked); }} />
          <span>Auf den Kopf stellen</span>
        </label>
      </div>
    </div>
  );
}

/* ---------- Rhythmus ---------- */

const PRESETS: Record<string, string> = {
  Marsch: 'x...x...x...x...',
  Walzer: 'x.....x.....x...',
  'Verschoben': 'x..x..x...x.x...',
};

export function RhythmusDemo() {
  const [pattern, setPattern] = useState(PRESETS['Marsch'].split('').map((c) => c === 'x'));
  const [playing, setPlaying] = usePlaying();
  const [step, setStep] = useState(-1);
  const patRef = useRef(pattern);
  patRef.current = pattern;
  const stopRef = useRef<() => void>(() => {});

  const start = () => {
    if (playing) return stopSynth();
    claimSynth();
    const c = audioCtx();
    const stepDur = 0.17;
    let next = c.currentTime + 0.08;
    let i = 0;
    let alive = true;
    const timer = window.setInterval(() => {
      while (alive && next < c.currentTime + 0.18) {
        const k = i % 16;
        const when = next - c.currentTime;
        if (k % 4 === 0) note(84, { when, dur: 0.05, vel: 0.12, timbre: TIMBRES.hell, release: 0.04 });
        if (patRef.current[k]) note(48, { when, dur: 0.16, vel: 0.7, timbre: TIMBRES.hohl, release: 0.08 });
        const shown = k;
        window.setTimeout(() => alive && setStep(shown), Math.max(0, when * 1000));
        next += stepDur;
        i += 1;
      }
    }, 30);
    stopRef.current = () => {
      alive = false;
      window.clearInterval(timer);
      setStep(-1);
    };
    setPlaying(true);
  };

  useEffect(() => onSynthStop(() => stopRef.current()), []);
  useEffect(() => () => stopRef.current(), []);

  return (
    <div className="demo">
      <div className="steps" role="group" aria-label="Sechzehn Zählzeiten; hohe Klicks markieren den gleichmäßigen Puls">
        {pattern.map((on, i) => (
          <button
            key={i}
            type="button"
            className={`step ${on ? 'on' : ''} ${i === step ? 'now' : ''} ${i % 4 === 0 ? 'beat' : ''}`}
            aria-pressed={on}
            aria-label={`Zählzeit ${i + 1}`}
            onClick={() => setPattern(pattern.map((v, k) => (k === i ? !v : v)))}
          />
        ))}
      </div>
      <div className="demo-row">
        <PlayBtn playing={playing} onClick={start}>{playing ? 'Anhalten' : 'Abspielen'}</PlayBtn>
        {Object.entries(PRESETS).map(([name, p]) => (
          <button key={name} type="button" className="chip" onClick={() => setPattern(p.split('').map((c) => c === 'x'))}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Harmonie ---------- */

const CHORDS: { name: string; notes: number[]; bar: number }[] = [
  { name: 'Zuhause', notes: [48, 52, 55], bar: 0 },
  { name: 'Unterwegs', notes: [43, 47, 50], bar: 1 },
  { name: 'Zuhause', notes: [48, 52, 55], bar: 2 },
  { name: 'Unterwegs', notes: [43, 47, 50], bar: 3 },
];

export function HarmonieDemo() {
  const [withChords, setWith] = useState(true);
  const [playing, setPlaying] = usePlaying();
  const [bar, setBar] = useState(-1);

  const run = () => {
    if (playing) return stopSynth();
    setPlaying(true);
    claimSynth();
    if (withChords) {
      let t = 0;
      CHORDS.forEach((c, i) => {
        const dur = (i === 3 ? 4 : 4) * BEAT;
        note(c.notes, { when: t, dur: dur * 0.95, vel: 0.28, timbre: TIMBRES.weich, attack: 0.04 });
        t += dur;
      });
    }
    sequence(
      ODE.map(([m, d]) => ({ m, d: d * BEAT, v: 0.55 })),
      { timbre: TIMBRES.hell, onStep: (i) => setBar(Math.min(3, Math.floor(ODE.slice(0, i).reduce((a, [, d]) => a + d, 0) / 4))), onEnd: () => { setPlaying(false); setBar(-1); } },
    );
  };

  return (
    <div className="demo">
      <div className="chordbar" aria-hidden="true">
        {CHORDS.map((c, i) => (
          <span key={i} className={`${c.name === 'Zuhause' ? 'home' : 'away'} ${bar === i ? 'now' : ''} ${withChords ? '' : 'off'}`}>
            {withChords ? c.name : ''}
          </span>
        ))}
      </div>
      <div className="demo-row">
        <PlayBtn playing={playing} onClick={run}>{playing ? 'Anhalten' : 'Hören'}</PlayBtn>
        <label className="demo-toggle">
          <input type="checkbox" checked={withChords} onChange={(e) => { stopSynth(); setWith(e.target.checked); }} />
          <span>Mit Akkorden darunter</span>
        </label>
      </div>
    </div>
  );
}

/* ---------- Tonart / Zuhause ---------- */

export function TonartDemo() {
  const [playing, setPlaying] = usePlaying();
  const [phase, setPhase] = useState<'idle' | 'up' | 'wait'>('idle');
  const scale = [60, 62, 64, 65, 67, 69, 71];

  const up = () => {
    stopSynth();
    claimSynth();
    setPlaying(true);
    setPhase('up');
    sequence(
      scale.map((m) => ({ m, d: BEAT * 0.75 })),
      { timbre: TIMBRES.hell, onEnd: () => { setPhase('wait'); setPlaying(false); } },
    );
  };
  const end = (m: number) => {
    claimSynth();
    note(m, { dur: 1.6, vel: 0.6, timbre: TIMBRES.hell, release: 0.4 });
    note(m - 12, { dur: 1.6, vel: 0.35, timbre: TIMBRES.weich, release: 0.4 });
    setPhase('idle');
  };

  return (
    <div className="demo">
      <div className="ladder" aria-hidden="true">
        {[...scale, 72].map((m, i) => (
          <span key={m} className={i === 7 ? 'goal' : ''} style={{ height: `${28 + i * 11}px` }} />
        ))}
      </div>
      <div className="demo-row">
        <PlayBtn playing={playing} onClick={up}>Tonleiter hinauf – und anhalten</PlayBtn>
        <button type="button" className="chip" disabled={phase !== 'wait'} onClick={() => end(72)}>
          Ankommen (Zuhause)
        </button>
        <button type="button" className="chip" disabled={phase !== 'wait'} onClick={() => end(66)}>
          Irgendwohin
        </button>
      </div>
      <p className="demo-note">Nach dem siebten Ton wartet das Ohr auf den achten. Wer ihn verweigert, erzeugt Spannung.</p>
    </div>
  );
}

/* ---------- Dur / Moll ---------- */

export function DurMollDemo() {
  const [v, setV] = useState(1);
  const [on, setOn] = useState(false);
  const d = useRef<ReturnType<typeof drone> | null>(null);

  useEffect(() => onSynthStop(() => { d.current = null; setOn(false); }), []);
  useEffect(() => () => { d.current?.stop(); }, []);
  useEffect(() => {
    d.current?.set(1, mtof(63 + v));
  }, [v]);

  const toggle = () => {
    if (on) return stopSynth();
    claimSynth();
    d.current = drone([mtof(48), mtof(63 + v), mtof(67), mtof(60)], TIMBRES.weich, 0.5);
    setOn(true);
  };
  const label = v > 0.85 ? 'Dur' : v < 0.15 ? 'Moll' : 'dazwischen';

  return (
    <div className="demo">
      <div className="demo-row">
        <PlayBtn playing={on} onClick={toggle}>{on ? 'Anhalten' : 'Akkord anschlagen'}</PlayBtn>
        <button type="button" className="chip" onClick={() => setV(0)}>Moll</button>
        <button type="button" className="chip" onClick={() => setV(1)}>Dur</button>
      </div>
      <label className="demo-slider">
        <span>Der mittlere Ton gleitet von Moll zu Dur: <b>{label}</b></span>
        <input type="range" min={0} max={1} step={0.01} value={v} onChange={(e) => setV(Number(e.target.value))} aria-label="Mittlerer Ton: von Moll (links) bis Dur (rechts)" />
      </label>
    </div>
  );
}

/* ---------- Dissonanz ---------- */

function roughness(semitones: number) {
  // Vereinfachtes Plomp-Levelt-Modell über sechs Teiltöne eines weichen Klangs
  const f1 = 261.6;
  const f2 = f1 * Math.pow(2, semitones / 12);
  let r = 0;
  for (let i = 1; i <= 6; i++) {
    for (let j = 1; j <= 6; j++) {
      const a = (1 / i) * (1 / j);
      const fa = f1 * i;
      const fb = f2 * j;
      const s = 0.24 / (0.0207 * Math.min(fa, fb) + 18.96);
      const x = s * Math.abs(fa - fb);
      r += a * (Math.exp(-3.5 * x) - Math.exp(-5.75 * x));
    }
  }
  return r;
}
const R_MAX = (() => {
  let m = 0;
  for (let s = 0; s <= 12; s += 0.05) m = Math.max(m, roughness(s));
  return m;
})();

export function DissonanzDemo() {
  const [x, setX] = useState(7);
  const [on, setOn] = useState(false);
  const d = useRef<ReturnType<typeof drone> | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => onSynthStop(() => { d.current = null; setOn(false); }), []);
  useEffect(() => () => { d.current?.stop(); }, []);
  useEffect(() => {
    d.current?.set(1, mtof(60 + x));
  }, [x]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const w = (cv.width = 600);
    const h = (cv.height = 120);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = getComputedStyle(cv).color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const f1 = 130; // optisch verlangsamt
    const f2 = f1 * Math.pow(2, x / 12);
    for (let px = 0; px < w; px++) {
      const t = (px / w) * 0.1;
      const y = 0.5 * Math.sin(2 * Math.PI * f1 * t) + 0.5 * Math.sin(2 * Math.PI * f2 * t);
      const py = h / 2 - y * (h / 2 - 8);
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }, [x]);

  const toggle = () => {
    if (on) return stopSynth();
    claimSynth();
    d.current = drone([mtof(60), mtof(60 + x)], TIMBRES.weich, 0.5);
    setOn(true);
  };
  const r = roughness(x) / R_MAX;
  const names: [number, string][] = [[0.3, 'gleicher Ton'], [1.5, 'Halbton – scharf'], [2.5, 'Ganzton'], [4.5, 'Terz'], [5.5, 'Quarte'], [6.5, 'Tritonus'], [7.5, 'Quinte'], [12, '']];
  const name = names.find(([lim]) => x < lim)?.[1] ?? '';

  return (
    <div className="demo">
      <canvas ref={canvas} className="demo-canvas" aria-label="Summe zweier Schwingungen; je gezackter, desto rauer klingt es" role="img" />
      <div className="meter" aria-hidden="true">
        <span style={{ width: `${Math.round(Math.min(1, r) * 100)}%` }} />
        <em>Reibung</em>
      </div>
      <div className="demo-row">
        <PlayBtn playing={on} onClick={toggle}>{on ? 'Anhalten' : 'Zwei Töne'}</PlayBtn>
        <span className="demo-note" aria-live="polite">Abstand: {x.toFixed(1)} Halbtöne {name && `· ${name}`}</span>
      </div>
      <label className="demo-slider">
        <span>Zweiten Ton verschieben</span>
        <input type="range" min={0} max={12} step={0.1} value={x} onChange={(e) => setX(Number(e.target.value))} aria-label="Abstand zwischen den zwei Tönen in Halbtönen" />
      </label>
    </div>
  );
}

/* ---------- Chromatik ---------- */

const WHITE = [0, 2, 4, 5, 7, 9, 11, 12];
const BLACKS = [1, 3, 6, 8, 10];

export function ChromatikDemo() {
  const [playing, setPlaying] = usePlaying();
  const [lit, setLit] = useState<number | null>(null);
  const [mode, setMode] = useState<'dur' | 'chrom'>('dur');

  const run = (m: 'dur' | 'chrom') => {
    stopSynth();
    setMode(m);
    setPlaying(true);
    const steps = m === 'dur' ? WHITE : Array.from({ length: 13 }, (_, i) => i);
    sequence(
      steps.map((s) => ({ m: 60 + s, d: m === 'dur' ? BEAT * 0.8 : BEAT * 0.55 })),
      { timbre: TIMBRES.hell, onStep: (i) => setLit(steps[i]), onEnd: () => { setPlaying(false); setLit(null); } },
    );
  };

  return (
    <div className="demo">
      <div className="piano" aria-hidden="true">
        {WHITE.slice(0, 7).concat([12]).map((s) => (
          <span key={s} className={`key white ${lit === s ? 'lit' : ''}`} />
        ))}
        {BLACKS.map((s) => {
          const pos = { 1: 0.65, 3: 1.65, 6: 3.65, 8: 4.65, 10: 5.65 }[s as 1 | 3 | 6 | 8 | 10];
          return <span key={s} className={`key black ${lit === s ? 'lit' : ''}`} style={{ left: `${(pos / 8) * 100}%` }} />;
        })}
      </div>
      <div className="demo-row">
        <PlayBtn playing={playing && mode === 'dur'} onClick={() => (playing && mode === 'dur' ? stopSynth() : run('dur'))}>Tonleiter: 7 Töne</PlayBtn>
        <PlayBtn playing={playing && mode === 'chrom'} onClick={() => (playing && mode === 'chrom' ? stopSynth() : run('chrom'))}>Chromatisch: alle 12</PlayBtn>
      </div>
    </div>
  );
}

/* ---------- Orchesterfarbe ---------- */

export function FarbeDemo() {
  const names = ['weich', 'hohl', 'hell', 'scharf'] as const;
  const [sel, setSel] = useState<(typeof names)[number]>('weich');
  const timbre = TIMBRES[sel];
  const play = (n: (typeof names)[number]) => {
    setSel(n);
    claimSynth();
    note(57, { dur: 1.6, vel: 0.55, timbre: TIMBRES[n], release: 0.3 });
  };
  return (
    <div className="demo">
      <div className="spectrum" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} style={{ height: `${Math.round((timbre[i] ?? 0) * 100)}%` }} />
        ))}
      </div>
      <div className="demo-row">
        {names.map((n) => (
          <button key={n} type="button" className={`chip ${sel === n ? 'is-on' : ''}`} aria-pressed={sel === n} onClick={() => play(n)}>
            {n}
          </button>
        ))}
      </div>
      <p className="demo-note">Immer derselbe Ton. Nur die Mischung der Obertöne (Balken) ändert sich. Das ist synthetisch erzeugt – keine echten Instrumente.</p>
    </div>
  );
}

/* ---------- Motiv ---------- */

const MOTIFS: { name: string; steps: { m: number; d: number }[] }[] = [
  { name: 'Original', steps: [{ m: 67, d: 0.5 }, { m: 67, d: 0.5 }, { m: 67, d: 0.5 }, { m: 63, d: 3 }] },
  { name: 'Eine Stufe tiefer', steps: [{ m: 65, d: 0.5 }, { m: 65, d: 0.5 }, { m: 65, d: 0.5 }, { m: 62, d: 3 }] },
  { name: 'Nach oben gewendet', steps: [{ m: 67, d: 0.5 }, { m: 67, d: 0.5 }, { m: 67, d: 0.5 }, { m: 71, d: 3 }] },
  { name: 'In Dur', steps: [{ m: 67, d: 0.5 }, { m: 67, d: 0.5 }, { m: 67, d: 0.5 }, { m: 64, d: 3 }] },
  { name: 'Gedehnt', steps: [{ m: 67, d: 1 }, { m: 67, d: 1 }, { m: 67, d: 1 }, { m: 63, d: 4 }] },
];

export function MotivDemo() {
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = usePlaying();
  const run = (i: number) => {
    stopSynth();
    setCur(i);
    setPlaying(true);
    sequence(
      MOTIFS[i].steps.map((s) => ({ m: s.m, d: s.d * BEAT, v: 0.65 })),
      { timbre: TIMBRES.hell, gap: 0.95, onEnd: () => setPlaying(false) },
    );
  };
  return (
    <div className="demo">
      <div className="blocks" aria-hidden="true">
        {MOTIFS[cur].steps.map((s, i) => (
          <span key={`${cur}-${i}`} style={{ flex: s.d, marginTop: `${(71 - s.m) * 4}px` }} />
        ))}
      </div>
      <div className="demo-row">
        {MOTIFS.map((m, i) => (
          <button key={m.name} type="button" className={`chip ${cur === i && playing ? 'is-on' : ''}`} onClick={() => run(i)}>
            {m.name}
          </button>
        ))}
      </div>
      <p className="demo-note">Drei kurze, ein langer Ton. Aus dieser Zelle baut Beethoven in seiner Fünften einen ganzen Satz.</p>
    </div>
  );
}

/* ---------- Wiederholung & Form ---------- */

const PHRASE_A = ODE.slice(0, 8);
const PHRASE_B: [number, number][] = [[67, 1], [69, 1], [71, 1], [72, 1], [71, 1], [69, 1], [67, 2]];

export function FormDemo() {
  const [order, setOrder] = useState<('A' | 'B')[]>(['A', 'A', 'B', 'A']);
  const [playing, setPlaying] = usePlaying();
  const [idx, setIdx] = useState(-1);
  const runAll = useCallback(() => {
    if (playing) return stopSynth();
    setPlaying(true);
    claimSynth();
    const steps: { m: number; d: number; v: number }[] = [];
    const marks: number[] = [];
    order.forEach((p, k) => {
      (p === 'A' ? PHRASE_A : PHRASE_B).forEach(([m, d], i) => {
        if (i === 0) marks[steps.length] = k;
        steps.push({ m, d: d * BEAT, v: 0.55 });
      });
    });
    sequence(steps, { timbre: TIMBRES.hell, onStep: (i) => marks[i] !== undefined && setIdx(marks[i]), onEnd: () => { setPlaying(false); setIdx(-1); } });
  }, [order, playing, setPlaying]);
  const preset = useMemo(() => ({ 'A A B A': ['A', 'A', 'B', 'A'], 'A B A B': ['A', 'B', 'A', 'B'], 'A B C?': ['A', 'B', 'B', 'A'] }) as Record<string, ('A' | 'B')[]>, []);

  return (
    <div className="demo">
      <div className="formbar" aria-hidden="true">
        {order.map((p, i) => (
          <span key={i} className={`${p === 'A' ? 'fa' : 'fb'} ${idx === i ? 'now' : ''}`}>{p}</span>
        ))}
      </div>
      <div className="demo-row">
        <PlayBtn playing={playing} onClick={runAll}>{playing ? 'Anhalten' : 'Abspielen'}</PlayBtn>
        {Object.entries(preset).filter(([k]) => k !== 'A B C?').map(([name, o]) => (
          <button key={name} type="button" className="chip" onClick={() => { stopSynth(); setOrder(o); }}>{name}</button>
        ))}
      </div>
      <p className="demo-note">A = bekannte Melodie, B = Kontrast (höher, andere Bewegung). Die Wiederkehr von A fühlt sich wie Heimkehr an.</p>
    </div>
  );
}

export const DEMOS: Record<string, () => React.ReactElement> = {
  melodie: () => <MelodieDemo />,
  rhythmus: () => <RhythmusDemo />,
  harmonie: () => <HarmonieDemo />,
  tonart: () => <TonartDemo />,
  'dur-moll': () => <DurMollDemo />,
  dissonanz: () => <DissonanzDemo />,
  chromatik: () => <ChromatikDemo />,
  farbe: () => <FarbeDemo />,
  motiv: () => <MotivDemo />,
  form: () => <FormDemo />,
};
