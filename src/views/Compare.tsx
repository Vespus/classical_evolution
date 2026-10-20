import { useEffect, useMemo } from 'react';
import { comparisons, getComparison, getStation, resolveRecording, resolvedStations } from '../data';
import { PlayerCard } from '../components/PlayerCard';
import { href, navigate } from '../lib/router';
import { play, pause, usePlayerState } from '../lib/audio';
import { clipTrack } from '../lib/tracks';
import { ArrowRight } from '../components/Icons';

export function Compare({ comparisonId }: { comparisonId?: string }) {
  const cmp = (comparisonId && getComparison(comparisonId)) || undefined;

  useEffect(() => {
    if (comparisonId && !cmp) navigate('/vergleich');
  }, [comparisonId, cmp]);

  if (!cmp) {
    return (
      <main id="main" tabIndex={-1} className="page compare-index wrap">
        <header className="page-head">
          <p className="eyebrow">Hör den Unterschied</p>
          <h1>Zwei Stücke direkt nacheinander. Hören Sie den Unterschied.</h1>
          <p className="lead">
            Erklärungen helfen, aber das Ohr merkt es schneller. Hier stehen zwei Stücke nebeneinander, die zeitlich nah beieinander liegen. Sie wechseln hin und her, ohne zu warten.
          </p>
        </header>
        <ul className="cmp-list">
          {comparisons.map((c) => (
            <li key={c.id}>
              <a className="cmp-card" href={href(`/vergleich/${c.id}`)}>
                <span className="cmp-card-pair">
                  <b>{c.a.label}</b>
                  <i aria-hidden="true">→</i>
                  <b>{c.b.label}</b>
                </span>
                <span className="cmp-card-q">{c.question}</span>
                <span className="cmp-card-go">
                  Vergleichen <ArrowRight width={16} height={16} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return <CompareDetail key={cmp.id} id={cmp.id} />;
}

function CompareDetail({ id }: { id: string }) {
  const cmp = getComparison(id)!;
  const A = useMemo(() => resolveRecording(cmp.a.recordingId), [cmp]);
  const B = useMemo(() => resolveRecording(cmp.b.recordingId), [cmp]);
  const state = usePlayerState();
  const idx = comparisons.findIndex((c) => c.id === id);
  const nextCmp = comparisons[(idx + 1) % comparisons.length];

  const aTrack = A.recording.provider === 'local' ? clipTrack(A.recording, A.work, A.composer) : null;
  const bTrack = B.recording.provider === 'local' ? clipTrack(B.recording, B.work, B.composer) : null;

  // Tastatur: A / B (oder 1 / 2) startet das jeweilige Stück, sofort und ohne Wartezeit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, [role="slider"]')) return;
      const k = e.key.toLowerCase();
      if ((k === 'a' || k === '1') && aTrack) play(aTrack);
      else if ((k === 'b' || k === '2') && bTrack) play(bTrack);
      else if (k === ' ' && !(e.target as HTMLElement).closest('button, a')) {
        e.preventDefault();
        if (state.status === 'playing' || state.status === 'loading') pause();
        else if (state.track) play(state.track);
        else if (aTrack) play(aTrack);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aTrack, bTrack, state]);

  const playingId = state.status === 'playing' || state.status === 'loading' ? state.track?.id : undefined;
  const sA = cmp.a.stationId ? getStation(cmp.a.stationId) : undefined;
  const sB = cmp.b.stationId ? getStation(cmp.b.stationId) : undefined;
  const bothLocal = !!aTrack && !!bTrack;

  return (
    <main id="main" tabIndex={-1} className="page compare wrap">
      <header className="page-head">
        <p className="eyebrow">
          <a href={href('/vergleich')}>Hör den Unterschied</a> · {idx + 1} von {comparisons.length}
        </p>
        <h1>{cmp.title}</h1>
        <p className="lead">{cmp.question}</p>
      </header>

      <div className="ab" role="group" aria-label="Zwei Hörbeispiele im Vergleich">
        {[
          { side: 'A', item: cmp.a, R: A, st: sA, track: aTrack },
          { side: 'B', item: cmp.b, R: B, st: sB, track: bTrack },
        ].map(({ side, item, R, st, track }) => (
          <section key={side} className={`ab-side ${track && playingId === track.id ? 'is-active' : ''}`} aria-label={`${side}: ${item.label}`}>
            <div className="ab-head">
              <span className="ab-badge" aria-hidden="true">{side}</span>
              <div>
                <h2>{item.label}</h2>
                <p>{item.sub}</p>
              </div>
            </div>
            <PlayerCard recording={R.recording} work={R.work} composer={R.composer} badge={side} compact />
            {st && (
              <a className="ab-link" href={href(`/reise/${st.id}`)}>
                Diese Station auf der Reise <ArrowRight width={14} height={14} />
              </a>
            )}
          </section>
        ))}
      </div>

      {bothLocal ? (
        <p className="ab-hint">
          Tipp: Mit den Tasten <kbd>A</kbd> und <kbd>B</kbd> wechseln Sie sofort hin und her. Leertaste hält an.
        </p>
      ) : (
        <p className="ab-hint">Mindestens eines der Beispiele ist ein Video von YouTube. Es wird erst nach Ihrem Klick geladen, der Wechsel dauert daher einen Moment. Es spielt immer nur eines.</p>
      )}

      <section className="notice" aria-labelledby="notice-h">
        <h2 id="notice-h" className="eyebrow">Achten Sie auf …</h2>
        <ol>
          {cmp.notice.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ol>
      </section>

      <p className="verdict">{cmp.verdict}</p>

      <nav className="cmp-pager" aria-label="Weitere Vergleiche">
        <a className="btn btn--ghost" href={href('/vergleich')}>Alle Vergleiche</a>
        <a className="btn" href={href(`/vergleich/${nextCmp.id}`)}>
          Nächster Vergleich: {nextCmp.a.label} → {nextCmp.b.label} <ArrowRight width={18} height={18} />
        </a>
      </nav>
      <p className="fine">
        Alle Stationen im Überblick: {resolvedStations.length} Stationen ·{' '}
        <a href={href('/reise')}>zur Reise</a>
      </p>
    </main>
  );
}
