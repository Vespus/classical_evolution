import { useEffect, useMemo, useState } from 'react';
import { formatTime, play, pause, preload, seek, usePlayerState, usePlayerTime } from '../lib/audio';
import { clipTrack, fullTrack } from '../lib/tracks';
import type { Composer, Recording, Work } from '../lib/types';
import { ExternalIcon, PauseIcon, PlayIcon, RefreshIcon, Spinner } from './Icons';
import { ExternalPlayer } from './ExternalPlayer';
import { Waveform } from './Waveform';

interface Props {
  recording: Recording;
  work: Work;
  composer: Composer;
  /** Beschriftung des Hauptknopfs, z. B. „A“ im Vergleich */
  badge?: string;
  compact?: boolean;
  /** Zusatzelemente neben „Quelle“ */
  extra?: React.ReactNode;
  /** Reaktion auf Start (z. B. für den Vergleich) */
  onPlay?: () => void;
  autoPreload?: boolean;
}

export function PlayerCard(props: Props) {
  return props.recording.provider === 'external' ? <ExternalPlayer {...props} /> : <LocalPlayer {...props} />;
}

function LocalPlayer({ recording, work, composer, badge, compact, extra, onPlay, autoPreload = true }: Props) {
  const [full, setFull] = useState(false);
  const clip = useMemo(() => clipTrack(recording, work, composer), [recording, work, composer]);
  const whole = useMemo(() => fullTrack(recording, work, composer), [recording, work, composer]);
  const track = full && whole ? whole : clip;

  const state = usePlayerState();
  const time = usePlayerTime();
  const mine = state.track?.id === track.id;
  const status = mine ? state.status : 'idle';
  const isPlaying = status === 'playing' || status === 'loading';
  const progress = mine && time.dur > 0 ? time.pos / time.dur : 0;
  const duration = mine && time.dur > 0 ? time.dur : recording.local!.clipEnd - recording.local!.clipStart;

  // Beim Wechsel der Aufnahme zurück auf den Ausschnitt
  useEffect(() => setFull(false), [recording.id]);

  useEffect(() => {
    if (autoPreload) preload(clip);
  }, [clip, autoPreload]);

  const toggle = () => {
    if (isPlaying) return pause();
    onPlay?.();
    play(track);
  };

  const switchMode = () => {
    const next = !full;
    setFull(next);
    const target = next && whole ? whole : clip;
    // Nur wenn gerade etwas dieser Aufnahme läuft, nahtlos umschalten
    if (state.track && (state.track.id === clip.id || state.track.id === whole?.id) && isPlaying) {
      play(target);
    }
  };

  const hasError = mine && status === 'error';
  const label = `${composer.name}: ${work.title}${work.part ? ', ' + work.part : ''}`;

  return (
    <div className={`player ${compact ? 'player--compact' : ''} ${isPlaying ? 'is-playing' : ''}`} data-status={status}>
      <div className="player-main">
        <button
          type="button"
          className="play-btn"
          onClick={toggle}
          aria-label={isPlaying ? `Pause: ${label}` : `Hören: ${label}`}
          aria-pressed={isPlaying}
          data-badge={badge}
        >
          {status === 'loading' ? <Spinner /> : isPlaying ? <PauseIcon /> : status === 'error' ? <RefreshIcon /> : <PlayIcon />}
        </button>
        <div className="player-meta">
          <div className="eyebrow">{full ? 'Ganze Aufnahme' : 'Hörbeispiel'}</div>
          <div className="player-title">
            {composer.name.split(' ').slice(-1)[0]}: {work.title}
            {work.part ? <span className="player-part">, {work.part}</span> : null}
          </div>
          <div className="player-sub">
            {recording.performer}
            {recording.recordedYear ? ` · ${recording.recordedYear}` : ''}
          </div>
        </div>
      </div>

      <Waveform
        recordingId={full ? '__none__' : recording.id}
        progress={progress}
        onSeek={(f) => {
          if (!mine) {
            play(track);
            window.setTimeout(() => seek(f), 60);
          } else seek(f);
        }}
        label={`Position in „${label}“`}
      />
      <div className="player-time" aria-hidden="true">
        <span>{formatTime(mine ? time.pos : 0)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {hasError && (
        <p className="player-error" role="alert">
          {state.error}{' '}
          <a href={recording.sourceUrl} target="_blank" rel="noreferrer noopener">
            Aufnahme bei der Quelle öffnen
          </a>
        </p>
      )}

      <div className="player-actions">
        {whole && (
          <button type="button" className="chip" onClick={switchMode} aria-pressed={full}>
            {full ? 'Zurück zum Ausschnitt' : 'Ganzen Satz hören'}
          </button>
        )}
        <a className="chip chip--link" href={work.fullListenUrl} target="_blank" rel="noreferrer noopener">
          {work.fullListenLabel} <ExternalIcon width={14} height={14} />
        </a>
        {extra}
      </div>
    </div>
  );
}
