import { useEffect, useRef } from 'react';
import { claimAudio, registerAudioOwner } from '../lib/audio';
import type { Composer, Recording, Work } from '../lib/types';
import { ExternalIcon } from './Icons';

interface Props {
  recording: Recording;
  work: Work;
  composer: Composer;
  src: string;
  badge?: string;
  compact?: boolean;
  extra?: React.ReactNode;
  onPlay?: () => void;
}

/* Es spielt immer nur ein Video; andere Quellen halten es an (und umgekehrt). */
let active: HTMLVideoElement | null = null;
registerAudioOwner('video', () => active?.pause());

/** Eigene Videodatei aus dem Ordner `media/` – mit den üblichen Bedienelementen des Browsers. */
export function VideoPlayer({ recording, work, composer, src, compact, extra, onPlay }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const label = `${composer.name}: ${work.title}${work.part ? ', ' + work.part : ''}`;

  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el && active === el) {
        el.pause();
        active = null;
      }
    };
  }, []);

  return (
    <div className={`player player--external player--video ${compact ? 'player--compact' : ''}`}>
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
      <div className="ext-frame ext-frame--file">
        <video
          ref={ref}
          src={src}
          controls
          playsInline
          preload="metadata"
          aria-label={label}
          onPlay={(e) => {
            onPlay?.();
            claimAudio('video');
            active = e.currentTarget;
          }}
        />
      </div>
      <div className="player-actions">
        <a className="chip chip--link" href={work.fullListenUrl} target="_blank" rel="noreferrer noopener">
          {work.fullListenLabel} <ExternalIcon width={14} height={14} />
        </a>
        {extra}
      </div>
    </div>
  );
}
