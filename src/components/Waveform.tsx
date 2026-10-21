import { useCallback, useId, useRef } from 'react';
import { peaks } from '../data';

interface Props {
  recordingId: string;
  progress: number; // 0–1
  onSeek?: (fraction: number) => void;
  label: string;
  disabled?: boolean;
}

/** Hüllkurve der Aufnahme als Fortschrittsanzeige und Zeitschieber. */
export function Waveform({ recordingId, progress, onSeek, label, disabled }: Props) {
  const data = peaks[recordingId] ?? new Array(96).fill(0.35);
  const ref = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const n = data.length;

  const fractionAt = useCallback((clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  }, []);

  const onPointer = (e: React.PointerEvent) => {
    if (disabled || !onSeek) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onSeek(fractionAt(e.clientX));
  };
  const onMove = (e: React.PointerEvent) => {
    if (disabled || !onSeek) return;
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) onSeek(fractionAt(e.clientX));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (disabled || !onSeek) return;
    const step = e.shiftKey ? 0.1 : 0.04;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSeek(Math.min(1, progress + step));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSeek(Math.max(0, progress - step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSeek(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSeek(1);
    }
  };

  return (
    <div
      ref={ref}
      className="wave"
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-valuetext={`${Math.round(progress * 100)} Prozent`}
      aria-disabled={disabled}
      onPointerDown={onPointer}
      onPointerMove={onMove}
      onKeyDown={onKey}
    >
      <svg viewBox={`0 0 ${n * 4} 48`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={Math.max(0, progress) * n * 4} height="48" />
          </clipPath>
        </defs>
        <g className="wave-base">
          {data.map((v, i) => (
            <rect key={i} x={i * 4 + 0.5} width="2.6" rx="1.3" y={24 - Math.max(2, v * 22)} height={Math.max(4, v * 44)} />
          ))}
        </g>
        <g className="wave-played" clipPath={`url(#${clipId})`}>
          {data.map((v, i) => (
            <rect key={i} x={i * 4 + 0.5} width="2.6" rx="1.3" y={24 - Math.max(2, v * 22)} height={Math.max(4, v * 44)} />
          ))}
        </g>
      </svg>
      <span className="wave-head" style={{ left: `${progress * 100}%` }} />
    </div>
  );
}
