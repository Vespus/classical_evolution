import { useEffect, useMemo, useRef, useState } from 'react';
import { resolvedStations, landscapeNotes } from '../data';
import { dimensions, ProfileBars } from '../components/Profile';
import { PlayerCard } from '../components/PlayerCard';
import { Figure } from '../components/Figure';
import { ArrowLeft, ArrowRight, CloseIcon } from '../components/Icons';
import { claimAudio } from '../lib/audio';
import { href, navigate } from '../lib/router';

const H = 100;
const PAD = 12;
const W = 1000;

/** Glatte Kurve durch die Punkte (Catmull-Rom → kubische Bézier). */
function smooth(points: [number, number][]) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const t = 0.18;
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

export function Landscape() {
  const n = resolvedStations.length;
  const [hover, setHover] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [roving, setRoving] = useState(0);
  const colRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const xs = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const pct = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);

  const noted = useMemo(() => new Set(landscapeNotes.map((x) => x.stationId)), []);
  const preview = hover ?? roving;
  const pv = resolvedStations[preview];

  const openStation = (i: number) => {
    setRoving(i);
    setOpen(i);
  };

  const onColumnKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -n : e.key === 'End' ? n : 0;
    if (!d) return;
    e.preventDefault();
    const next = Math.min(n - 1, Math.max(0, i + d));
    setRoving(next);
    setHover(null);
    colRefs.current[next]?.focus();
  };

  return (
    <main id="main" tabIndex={-1} className="page landscape">
      <header className="wrap page-head page-head--compact">
        <p className="eyebrow">Die Landschaft</p>
        <h1>Fünf Eigenschaften im Lauf der Zeit.</h1>
        <p className="lead">
          Jede Linie zeigt, wo die Stationen zwischen zwei Gegensätzen liegen, etwa „weich“ und „scharf“ – eine Einschätzung, keine Messung.{' '}
          <strong>Klicken Sie auf eine Station</strong>: Sie sehen sie genauer und können hineinhören.
        </p>
      </header>

      <section className="wrap land-wrap" aria-label="Diagramm der fünf Eigenschaften">
        <p className="land-preview" aria-hidden="true">
          <span className="land-preview-year">{pv.station.year}</span>
          <strong>{pv.composer.name.split(' ').slice(-1)[0]}</strong>
          <span>{pv.station.headline}</span>
          <em>Zum Öffnen klicken</em>
        </p>

        <div className="land-scroll">
          <div className="land">
            <div className="land-body">
              {dimensions.map((d) => {
                const pts: [number, number][] = resolvedStations.map((r, i) => [xs(i), PAD + (1 - r.station.profile[d.key]) * (H - PAD * 2)]);
                const path = smooth(pts);
                const area = `${path} L ${W} ${H} L 0 ${H} Z`;
                return (
                  <div className="lane" key={d.key}>
                    <div className="lane-label">
                      <strong>{d.label}</strong>
                      <span className="lane-pole lane-pole--hi">↑ {d.right}</span>
                      <span className="lane-pole lane-pole--lo">↓ {d.left}</span>
                    </div>
                    <div className="lane-plot" title={d.hint}>
                      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                        <path className="lane-area" d={area} />
                        <path className="lane-line" d={path} vectorEffect="non-scaling-stroke" />
                      </svg>
                      {pts.map(([x, y], i) => (
                        <span
                          key={i}
                          className={`lane-dot ${i === preview ? 'is-on' : ''} ${noted.has(resolvedStations[i].station.id) ? 'has-note' : ''}`}
                          style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="land-cols" role="list" aria-label="Stationen. Mit den Pfeiltasten wechseln, mit Eingabe öffnen.">
                {resolvedStations.map((r, i) => (
                  <button
                    key={r.station.id}
                    ref={(el) => {
                      colRefs.current[i] = el;
                    }}
                    role="listitem"
                    type="button"
                    className={`land-col ${i === preview ? 'is-on' : ''} ${i % 2 ? 'is-odd' : ''}`}
                    style={{ left: `${pct(i)}%` }}
                    tabIndex={i === roving ? 0 : -1}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                    onFocus={() => {
                      setRoving(i);
                      setHover(null);
                    }}
                    onKeyDown={(e) => onColumnKey(e, i)}
                    onClick={() => openStation(i)}
                    aria-label={`${r.composer.name.split(' ').slice(-1)[0]}, ${r.station.year}: Einordnung und Hörbeispiel öffnen`}
                  >
                    <span className="land-col-name">{r.station.short}</span>
                    <span className="land-col-year">{r.station.year}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="wrap land-umwege" aria-labelledby="umwege-h">
        <h2 id="umwege-h" className="eyebrow">
          Umwege: hier geht es nicht einfach „weiter“
        </h2>
        <ul>
          {landscapeNotes.map((nt) => {
            const i = resolvedStations.findIndex((r) => r.station.id === nt.stationId);
            if (i < 0) return null;
            return (
              <li key={nt.text}>
                <button type="button" className="chip" onClick={() => openStation(i)}>
                  {nt.text}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="wrap fine land-fine">
        <p>
          Die Stationen sind gleichmäßig verteilt, nicht nach Jahren: Zwischen Bach und Beethoven liegen gut achtzig Jahre, zwischen Ligeti und Reich nur fünfzehn.
          Wichtig ist der Verlauf der Linien. Es geht nicht immer „weiter“: Mehrmals kehrt die Musik auch zur Ordnung zurück. Das ist Absicht.
        </p>
      </section>

      {open !== null && <StationDialog index={open} onIndex={(i) => { setOpen(i); setRoving(i); }} onClose={() => { claimAudio('dialog'); setOpen(null); }} />}
    </main>
  );
}

function StationDialog({ index, onIndex, onClose }: { index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const r = resolvedStations[index];
  const prev = index > 0 ? resolvedStations[index - 1] : undefined;
  const next = index < resolvedStations.length - 1 ? resolvedStations[index + 1] : undefined;
  const note = landscapeNotes.find((x) => x.stationId === r.station.id);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  // Beim Wechsel der Station oben beginnen; Ton der vorigen Station anhalten
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
    claimAudio('dialog');
  }, [index]);

  const go = (i: number) => onIndex(i);

  return (
    <dialog
      ref={ref}
      className="land-dialog"
      data-theme={r.station.theme}
      aria-labelledby="ld-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' && next && !(e.target as HTMLElement).closest('input, [role="slider"], iframe, video')) go(index + 1);
        else if (e.key === 'ArrowLeft' && prev && !(e.target as HTMLElement).closest('input, [role="slider"], iframe, video')) go(index - 1);
      }}
    >
      <div className="ld-inner">
        <header className="ld-head">
          <p className="eyebrow">
            Station {String(index + 1).padStart(2, '0')} / {resolvedStations.length} · {r.period.name} · {r.station.year}
          </p>
          <button type="button" className="ld-close" onClick={() => ref.current?.close()} aria-label="Schließen">
            <CloseIcon width={20} height={20} />
          </button>
        </header>

        <div className="ld-body" ref={bodyRef}>
          <h2 id="ld-title">{r.station.headline}</h2>
          <p className="ld-work">
            {r.composer.name}: {r.work.title}
            {r.work.part ? `, ${r.work.part}` : ''}
          </p>
          {note && <p className="ld-note">{note.text}</p>}

          <div className="ld-grid">
            <div className="ld-listen">
              <PlayerCard key={r.recording.id} recording={r.recording} work={r.work} composer={r.composer} compact autoPreload={false} />
              <p className="ld-lead">{r.station.lead}</p>
            </div>
            <div className="ld-chart">
              <h3 className="eyebrow">So klingt es im Vergleich zu {prev ? prev.station.short : 'dem Beginn'}</h3>
              <ProfileBars profile={r.station.profile} previous={prev?.station.profile} previousLabel={prev?.station.short} />
              <p className="fine">Eine Einschätzung, keine Messung. Der blasse Punkt zeigt {prev ? prev.station.short : 'den Vorgänger'}.</p>
            </div>
          </div>

          <div className="ld-new">
            <h3 className="eyebrow">{prev ? `Was ist neu gegenüber ${prev.station.short}?` : 'Hier beginnt die Reise'}</h3>
            <p>
              <strong>{r.station.whatsNew.title}.</strong> {r.station.whatsNew.text}
            </p>
          </div>

          <Figure imageId={r.station.imageId} className="ld-figure" />
        </div>

        <footer className="ld-foot">
          <button type="button" className="btn btn--ghost" onClick={() => go(index - 1)} disabled={!prev}>
            <ArrowLeft width={18} height={18} /> {prev ? prev.station.short : 'Zurück'}
          </button>
          <a
            className="btn"
            href={href(`/reise/${r.station.id}`)}
            onClick={(e) => {
              e.preventDefault();
              claimAudio('dialog');
              navigate(`/reise/${r.station.id}`);
            }}
          >
            Zur ganzen Station <ArrowRight width={18} height={18} />
          </a>
          <button type="button" className="btn btn--ghost" onClick={() => go(index + 1)} disabled={!next}>
            {next ? next.station.short : 'Weiter'} <ArrowRight width={18} height={18} />
          </button>
        </footer>
      </div>
    </dialog>
  );
}
