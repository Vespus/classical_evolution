import { pause, play, usePlayerState, usePlayerTime } from '../lib/audio';
import { PauseIcon, PlayIcon } from './Icons';

/** Schwebende Anzeige, solange irgendwo etwas gespielt wird, ohne dass der große Player sichtbar ist. */
export function MiniPlayer({ hidden }: { hidden: boolean }) {
  const state = usePlayerState();
  const time = usePlayerTime();
  const t = state.track;
  if (!t || hidden || state.status === 'idle') return null;
  const isPlaying = state.status === 'playing' || state.status === 'loading';
  const progress = time.dur > 0 ? time.pos / time.dur : 0;
  return (
    <div className="mini" role="region" aria-label="Wiedergabe">
      <button
        type="button"
        className="mini-btn"
        onClick={() => (isPlaying ? pause() : play(t))}
        aria-label={isPlaying ? 'Pause' : 'Weiter hören'}
      >
        {isPlaying ? <PauseIcon width={18} height={18} /> : <PlayIcon width={18} height={18} />}
      </button>
      <div className="mini-text">
        <strong>{t.title}</strong>
        <span>{t.subtitle}</span>
      </div>
      <span className="mini-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})` }} />
      </span>
    </div>
  );
}
