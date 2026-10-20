import { useEffect, useMemo, useRef, useState } from 'react';
import { resolvedStations } from '../data';
import { audioUrl } from '../data';
import { play, pause, usePlayerState, type Track } from '../lib/audio';
import { PauseIcon, PlayIcon } from './Icons';

const SLICE = 7;

/** Musikgeschichte im Zeitraffer: kurze Anfänge der lokal verfügbaren Stationen hintereinander. */
export function Zeitraffer() {
  const slices = useMemo(
    () =>
      resolvedStations
        .filter((r) => r.recording.provider === 'local' && r.station.rush !== false)
        .map((r) => {
          const [s, e] = Array.isArray(r.station.rush) ? r.station.rush : [0, SLICE];
          const track: Track = {
            id: `rush:${r.station.id}`,
            src: audioUrl(r.recording.local!.clip),
            title: `Zeitraffer · ${r.composer.name.split(' ').slice(-1)[0]}`,
            subtitle: `${r.station.year} · ${r.work.title}`,
            start: s,
            end: e,
            kind: 'clip',
          };
          return { r, track };
        }),
    [],
  );
  const state = usePlayerState();
  const [started, setStarted] = useState(false);
  const idxRef = useRef(0);

  const current = slices.findIndex((s) => s.track.id === state.track?.id);
  const running = current >= 0 && (state.status === 'playing' || state.status === 'loading');

  // Nach Ende einer Scheibe die nächste starten
  useEffect(() => {
    if (current < 0 || !started) return;
    idxRef.current = current;
    if (state.status === 'ended') {
      const next = slices[current + 1];
      if (next) play(next.track);
      else setStarted(false);
    }
  }, [state.status, state.track?.id, current, slices, started]);

  const toggle = () => {
    if (running) return pause();
    setStarted(true);
    if (current >= 0 && state.status === 'paused') play(slices[current].track);
    else play(slices[0].track);
  };

  const active = current >= 0 && started ? slices[current] : undefined;

  return (
    <div className="rush" data-running={running || undefined}>
      <button type="button" className="rush-btn" onClick={toggle} aria-pressed={running}>
        {running ? <PauseIcon /> : <PlayIcon />}
        <span>
          <strong>{running ? 'Pause' : 'Zeitraffer hören'}</strong>
          <small>{slices.length} Ausschnitte, etwa {Math.round((slices.length * SLICE) / 10) * 10} Sekunden</small>
        </span>
      </button>
      <ol className="rush-dots" aria-label="Fortschritt im Zeitraffer">
        {slices.map((s, i) => (
          <li key={s.track.id} className={i === current && started ? 'is-now' : i < current && started ? 'is-done' : ''}>
            <span className="sr-only">{s.r.station.short}</span>
          </li>
        ))}
      </ol>
      <p className="rush-caption" aria-live="polite">
        {active ? (
          <>
            <b>{active.r.station.year}</b> · {active.r.composer.name}
          </>
        ) : (
          'Von Bach bis Schönberg – jeweils ein paar Sekunden.'
        )}
      </p>
    </div>
  );
}
