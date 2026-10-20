import { useMemo, useState } from 'react';
import { resolvedStations, landscapeNotes, periods } from '../data';
import { dimensions } from '../components/Profile';
import { href, navigate } from '../lib/router';
import { play, usePlayerState } from '../lib/audio';
import { clipTrack } from '../lib/tracks';
import { ArrowRight, PlayIcon } from '../components/Icons';

const H = 120;
const PAD = 14;

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
  const [active, setActive] = useState<number>(Math.min(5, n - 1));
  const [focusDim, setFocusDim] = useState<string | null>(null);
  const player = usePlayerState();
  const cur = resolvedStations[active];
  const W = 1000;
  const xs = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);

  const groups = useMemo(() => {
    const g: { id: string; name: string; from: number; to: number }[] = [];
    resolvedStations.forEach((r, i) => {
      const last = g[g.length - 1];
      if (last && last.id === r.station.periodId) last.to = i;
      else g.push({ id: r.station.periodId, name: r.period.name, from: i, to: i });
    });
    return g;
  }, []);
  void periods;

  const canPlay = cur.recording.provider === 'local';
  const isPlayingCur = canPlay && player.track?.id === cur.recording.id && (player.status === 'playing' || player.status === 'loading');

  return (
    <main id="main" tabIndex={-1} className="page landscape">
      <header className="wrap page-head">
        <p className="eyebrow">Die Landschaft</p>
        <h1>Fünf Regler, die sich über die Jahrhunderte verschieben – nicht alle in dieselbe Richtung.</h1>
        <p className="lead">
          Jede Linie zeigt, wo die Stationen der Reise zwischen zwei Polen liegen. Das sind redaktionelle Einschätzungen, keine Messwerte: Sie sollen den Wandel
          auf einen Blick lesbar machen, nicht vermessen. Fahren Sie mit dem Zeiger oder den Pfeiltasten über die Zeit.
        </p>
      </header>

      <section className="wrap land-wrap" aria-label="Diagramm der fünf Dimensionen">
        <div className="land-scroll">
          <div className="land" style={{ ['--n' as string]: n }}>
            <div className="land-periods" aria-hidden="true">
              {groups.map((g) => (
                <span
                  key={g.id + g.from}
                  style={{ left: `${(xs(g.from) / W) * 100 - (g.from === 0 ? 0 : 50 / (n - 1))}%`, width: `${((g.to - g.from + 1) / n) * 100}%` }}
                >
                  {g.name}
                </span>
              ))}
            </div>

            {dimensions.map((d) => {
              const pts: [number, number][] = resolvedStations.map((r, i) => [xs(i), PAD + (1 - r.station.profile[d.key]) * (H - PAD * 2)]);
              const path = smooth(pts);
              const area = `${path} L ${W} ${H} L 0 ${H} Z`;
              const dim = focusDim && focusDim !== d.key;
              const notes = landscapeNotes.filter((x) => x.dim === d.key);
              return (
                <div className={`lane ${dim ? 'is-dim' : ''} ${notes.length ? 'lane--notes' : ''}`} key={d.key}>
                  <div className="lane-head">
                    <button type="button" className="lane-name" onClick={() => setFocusDim(focusDim === d.key ? null : d.key)} aria-pressed={focusDim === d.key}>
                      {d.label}
                    </button>
                    <span className="lane-hint">{d.hint}</span>
                  </div>
                  <div className="lane-plot">
                    <span className="lane-pole lane-pole--hi">{d.right}</span>
                    <span className="lane-pole lane-pole--lo">{d.left}</span>
                    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                      <path className="lane-area" d={area} />
                      <path className="lane-line" d={path} vectorEffect="non-scaling-stroke" />
                    </svg>
                    {pts.map(([x, y], i) => (
                      <span
                        key={i}
                        className={`lane-dot ${i === active ? 'is-active' : ''}`}
                        style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
                      />
                    ))}
                    {notes.map((nt) => {
                      const i = resolvedStations.findIndex((r) => r.station.id === nt.stationId);
                      if (i < 0) return null;
                      const y = pts[i][1] / H;
                      return (
                        <span
                          key={nt.text}
                          className={`lane-note ${i > n * 0.8 ? 'left' : ''}`}
                          style={{ left: `${(xs(i) / W) * 100}%`, top: `${y * 100}%` }}
                        >
                          {nt.text}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div
              className="land-stations"
              role="list"
              aria-label="Stationen – mit den Pfeiltasten durch die Zeit fahren"
              onKeyDown={(e) => {
                const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                const next = Math.min(n - 1, Math.max(0, active + d));
                setActive(next);
                (e.currentTarget.querySelectorAll('button')[next] as HTMLElement | undefined)?.focus();
              }}
            >
              {resolvedStations.map((r, i) => (
                <button
                  key={r.station.id}
                  role="listitem"
                  type="button"
                  className={`land-st ${i === active ? 'is-active' : ''}`}
                  style={{ left: `${(xs(i) / W) * 100}%` }}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  aria-label={`${r.station.short}, ${r.station.year}`}
                  aria-current={i === active}
                >
                  <span className="land-st-name">{r.station.short}</span>
                  <span className="land-st-year">{r.station.year}</span>
                </button>
              ))}
              <span className="land-cursor" style={{ left: `${(xs(active) / W) * 100}%` }} aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className="wrap land-detail" data-theme={cur.station.theme} aria-live="polite">
        <div className="land-card">
          <div>
            <p className="eyebrow">
              {cur.period.name} · {cur.station.year}
            </p>
            <h2>{cur.station.headline}</h2>
            <p>
              {cur.composer.name}: {cur.work.title}
              {cur.work.part ? `, ${cur.work.part}` : ''}
            </p>
          </div>
          <div className="land-actions">
            {canPlay && (
              <button type="button" className="btn" onClick={() => play(clipTrack(cur.recording, cur.work, cur.composer))} aria-pressed={isPlayingCur}>
                <PlayIcon width={18} height={18} /> {isPlayingCur ? 'Läuft …' : 'Hineinhören'}
              </button>
            )}
            <a className="btn btn--ghost" href={href(`/reise/${cur.station.id}`)} onClick={(e) => { e.preventDefault(); navigate(`/reise/${cur.station.id}`); }}>
              Zur Station <ArrowRight width={18} height={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="wrap fine land-fine">
        <p>
          Die Abstände zwischen den Stationen sind gleichmäßig gewählt, nicht maßstäblich: zwischen Bach und Beethoven liegen gut achtzig Jahre, zwischen Ligeti und
          Reich nur wenige. Wichtig ist die Form der Linien. Sie sind keine Fortschrittskurven – mehrmals geht es auch wieder zurück zur Ordnung, und das ist Absicht.
        </p>
      </section>
    </main>
  );
}
