import { useEffect, useMemo, useRef } from 'react';
import type { Resolved } from '../data';
import { href } from '../lib/router';
import { useFavorites, useVisited } from '../lib/storage';

interface Props {
  stations: Resolved[];
  activeIndex: number;
}

/** Zeitleiste: gleichmäßig verteilte Stationen, Epochenbänder, Fortschritt. Abstände sind nicht maßstäblich. */
export function Timeline({ stations, activeIndex }: Props) {
  const visited = useVisited();
  const favorites = useFavorites();
  const scroller = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  const groups = useMemo(() => {
    const out: { periodId: string; name: string; items: { r: Resolved; index: number }[] }[] = [];
    stations.forEach((r, index) => {
      const last = out[out.length - 1];
      if (last && last.periodId === r.station.periodId) last.items.push({ r, index });
      else out.push({ periodId: r.station.periodId, name: r.period.name, items: [{ r, index }] });
    });
    return out;
  }, [stations]);

  useEffect(() => {
    const sc = scroller.current;
    const el = activeRef.current;
    if (!sc || !el) return;
    const target = el.offsetLeft - sc.clientWidth / 2 + el.clientWidth / 2;
    sc.scrollTo({ left: Math.max(0, target), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [activeIndex]);

  const progress = stations.length > 1 ? activeIndex / (stations.length - 1) : 0;

  return (
    <nav className="timeline" aria-label="Zeitleiste der Stationen">
      <div className="timeline-scroll" ref={scroller}>
        <ol className="timeline-track" style={{ ['--n' as string]: stations.length }}>
          {groups.map((g) => (
            <li key={g.periodId + g.items[0].index} className="tl-group" style={{ flexGrow: g.items.length }}>
              <span className="tl-period">{g.name}</span>
              <ol className="tl-items">
                {g.items.map(({ r, index }) => {
                  const active = index === activeIndex;
                  const isVisited = visited.includes(r.station.id);
                  const isFav = favorites.some((f) => f.stationId === r.station.id);
                  return (
                    <li key={r.station.id} className="tl-item" data-theme={r.station.theme}>
                      <a
                        ref={active ? activeRef : undefined}
                        href={href(`/reise/${r.station.id}`)}
                        className={`tl-link ${active ? 'is-active' : ''} ${isVisited ? 'is-visited' : ''} ${index < activeIndex ? 'is-past' : ''}`}
                        aria-current={active ? 'step' : undefined}
                        aria-label={`Station ${index + 1}: ${r.station.short}, ${r.station.year}${isFav ? ', gemerkt' : ''}`}
                      >
                        <span className="tl-dot">{isFav ? <i className="tl-fav" /> : null}</span>
                        <span className="tl-name">{r.station.short}</span>
                        <span className="tl-year">{r.station.year}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
          <span className="tl-rail" aria-hidden="true">
            <span className="tl-rail-fill" style={{ transform: `scaleX(${progress})` }} />
          </span>
        </ol>
      </div>
    </nav>
  );
}
