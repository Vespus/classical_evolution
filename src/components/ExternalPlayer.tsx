import { useEffect, useState } from 'react';
import { claimAudio, registerAudioOwner } from '../lib/audio';
import type { Composer, Recording, Work } from '../lib/types';
import { CloseIcon, ExternalIcon, PlayIcon } from './Icons';

interface Props {
  recording: Recording;
  work: Work;
  composer: Composer;
  badge?: string;
  compact?: boolean;
  extra?: React.ReactNode;
  onPlay?: () => void;
}

/* Es darf immer nur ein externer Player offen sein. */
let activeId: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
function openExternal(id: string) {
  claimAudio('external');
  activeId = id;
  notify();
}
function closeExternal() {
  activeId = null;
  notify();
}
registerAudioOwner('external', closeExternal);

function useActive(id: string) {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return activeId === id;
}

/**
 * Für Werke, deren Aufnahme oder Komposition nicht frei verfügbar ist: Einbettung eines offiziellen Streams.
 * Der Fremdinhalt wird erst nach ausdrücklichem Klick geladen (kein Tracking beim bloßen Besuch).
 */
export function ExternalPlayer({ recording, work, composer, badge, compact, extra, onPlay }: Props) {
  const ext = recording.external!;
  const open = useActive(recording.id);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) setFailed(false);
  }, [open]);

  const src = `https://www.youtube-nocookie.com/embed/${ext.videoId}?start=${ext.start}&end=${ext.end}&autoplay=1&rel=0&modestbranding=1&playsinline=1&hl=de&cc_lang_pref=de`;
  const label = `${composer.name}: ${work.title}${work.part ? ', ' + work.part : ''}`;

  return (
    <div className={`player player--external ${compact ? 'player--compact' : ''} ${open ? 'is-playing' : ''}`}>
      <div className="player-main">
        <button
          type="button"
          className="play-btn"
          data-badge={badge}
          onClick={() => {
            onPlay?.();
            if (open) closeExternal();
            else openExternal(recording.id);
          }}
          aria-label={open ? `Video schließen: ${label}` : `Video laden und ansehen: ${label}`}
          aria-pressed={open}
        >
          {open ? <CloseIcon /> : <PlayIcon />}
        </button>
        <div className="player-meta">
          <div className="eyebrow">Hörbeispiel · Video</div>
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

      {open ? (
        <div className="ext-frame">
          <iframe
            title={`Externer Player: ${label}`}
            src={src}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onError={() => setFailed(true)}
          />
        </div>
      ) : (
        <div className="ext-note">
          <p>
            Dieses Beispiel ist ein Video von {ext.channel} auf YouTube (Ausschnitt, etwa {Math.round((ext.end - ext.start) / 6) / 10} Minuten). Es wird erst
            geladen, wenn Sie auf Start drücken.
          </p>
        </div>
      )}
      {failed && (
        <p className="player-error" role="alert">
          Das Video lässt sich nicht laden. Über „Bei YouTube öffnen“ geht es meist trotzdem.
        </p>
      )}

      <div className="player-actions">
        <a className="chip chip--link" href={work.fullListenUrl} target="_blank" rel="noreferrer noopener">
          {work.fullListenLabel} <ExternalIcon width={14} height={14} />
        </a>
        {extra}
      </div>
    </div>
  );
}
