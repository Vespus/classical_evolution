import { useEffect, useRef } from 'react';
import { resolvedStations, getComparison, concepts } from '../data';
import { Timeline } from '../components/Timeline';
import { PlayerCard } from '../components/PlayerCard';
import { ProfileBars } from '../components/Profile';
import { Forces } from '../components/Forces';
import { Figure } from '../components/Figure';
import { BookmarkButton } from '../components/Bookmark';
import { ArrowLeft, ArrowRight } from '../components/Icons';
import { href, navigate } from '../lib/router';
import { markVisited, setLastStation, useLastStation } from '../lib/storage';
import { pause, play, usePlayerState } from '../lib/audio';
import { clipTrack } from '../lib/tracks';

const SWIFT_TAG = { kennen: 'Das kennen Sie schon', verwandt: 'Das ist verwandt', anders: 'Hier ist es anders' } as const;

export function Journey({ stationId }: { stationId?: string }) {
  const last = useLastStation();
  const lastKnown = resolvedStations.find((r) => r.station.id === last);

  // /reise ohne Station: dort weitermachen, wo man war – sonst am Anfang
  useEffect(() => {
    if (!stationId) navigate(`/reise/${(lastKnown ?? resolvedStations[0]).station.id}`);
  }, [stationId, lastKnown]);

  const index = resolvedStations.findIndex((r) => r.station.id === stationId);
  const prevIndex = useRef(index);
  const direction = index >= prevIndex.current ? 1 : -1;

  useEffect(() => {
    prevIndex.current = index;
    if (index >= 0) {
      markVisited(resolvedStations[index].station.id);
      setLastStation(resolvedStations[index].station.id);
    }
  }, [index]);

  // Nach Stationswechsel nach oben
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [stationId]);

  const player = usePlayerState();

  // Tastatur: ← → Stationen, Leertaste Wiedergabe
  useEffect(() => {
    if (index < 0) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.closest('input, textarea, select, [role="slider"], [contenteditable]')) return;
      if (e.key === 'ArrowRight' && index < resolvedStations.length - 1) {
        navigate(`/reise/${resolvedStations[index + 1].station.id}`);
      } else if (e.key === 'ArrowLeft' && index > 0) {
        navigate(`/reise/${resolvedStations[index - 1].station.id}`);
      } else if (e.key === ' ' && !el.closest('button, a, summary')) {
        e.preventDefault();
        const r = resolvedStations[index];
        if (r.recording.provider !== 'local') return;
        const t = clipTrack(r.recording, r.work, r.composer);
        if (player.track?.id === t.id && (player.status === 'playing' || player.status === 'loading')) pause();
        else play(t);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, player]);

  if (index < 0) return <main id="main" tabIndex={-1} className="wrap page"><p>Die Reise wird vorbereitet …</p></main>;

  const cur = resolvedStations[index];
  const prev = index > 0 ? resolvedStations[index - 1] : undefined;
  const next = index < resolvedStations.length - 1 ? resolvedStations[index + 1] : undefined;
  const { station, work, composer, recording, period } = cur;
  const cmp = station.compareId ? getComparison(station.compareId) : undefined;
  const concept = (station.conceptIds ?? []).map((id) => concepts.find((c) => c.id === id)).filter(Boolean);
  const num = String(index + 1).padStart(2, '0');

  return (
    <>
      <main id="main" tabIndex={-1} className="journey" key={station.id} style={{ ['--dir' as string]: direction }}>
        <article className="station">
          <header className="st-head wrap">
            <p className="st-meta eyebrow">
              <span>
                Station {num} <span className="st-of">/ {resolvedStations.length}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>{period.name}</span>
              <span aria-hidden="true">·</span>
              <span>{station.year}</span>
            </p>
            <h1 className="st-title">{station.headline}</h1>
            <p className="st-kicker">{station.kicker}</p>
          </header>

          <section className="st-listen wrap" aria-label="Hörbeispiel">
            <div className="st-listen-main">
              <PlayerCard
                recording={recording}
                work={work}
                composer={composer}
                extra={<BookmarkButton stationId={station.id} label={`${composer.name}: ${work.title}`} />}
              />
              <div className="listenfor">
                <h2 className="eyebrow">Worauf Sie achten können</h2>
                <ol>
                  {station.listenFor.map((t, i) => (
                    <li key={i}>
                      <span className="listenfor-n" aria-hidden="true">{i + 1}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <Figure imageId={station.imageId} className="st-figure" />
          </section>

          <section className="st-lead wrap">
            <p>{station.lead}</p>
          </section>

          <section className="st-cards wrap">
            <div className="card card--new">
              <h2 className="eyebrow">{prev ? `Was ist neu gegenüber ${prev.station.short}?` : 'Hier beginnt die Reise'}</h2>
              <h3>{station.whatsNew.title}</h3>
              <p>{station.whatsNew.text}</p>
              {station.term && (
                <p className="term">
                  <span className="term-word">{station.term.word}</span> {station.term.text}
                </p>
              )}
              {cmp && (
                <a className="btn btn--ghost" href={href(`/vergleich/${cmp.id}`)}>
                  Beide direkt nacheinander hören <ArrowRight width={18} height={18} />
                </a>
              )}
            </div>

            <div className="card card--profile">
              <h2 className="eyebrow">So klingt es im Vergleich</h2>
              <ProfileBars profile={station.profile} previous={prev?.station.profile} previousLabel={prev?.station.short} />
              <p className="fine">Das ist eine Einschätzung, keine Messung. Der blasse Punkt zeigt {prev ? prev.station.short : 'den Vorgänger'}.</p>
              <h2 className="eyebrow eyebrow--spaced">Besetzung</h2>
              <Forces forces={station.forces} />
            </div>

            <div className="card card--context">
              <h2 className="eyebrow">Warum klingt es so?</h2>
              <h3>{station.context.title}</h3>
              <p>{station.context.text}</p>
            </div>

            <div className={`card card--swift swift--${station.swift.tag}`}>
              <h2 className="eyebrow">Und Taylor Swift?</h2>
              <p className="swift-tag">{SWIFT_TAG[station.swift.tag]}</p>
              <p>{station.swift.text}</p>
            </div>

            {station.alongside && (
              <div className="card card--alongside">
                <h2 className="eyebrow">Gleichzeitig</h2>
                <h3>{station.alongside.title}</h3>
                <p>{station.alongside.text}</p>
              </div>
            )}
          </section>

          {concept.length > 0 && (
            <section className="st-concepts wrap">
              <span className="eyebrow">Kurz erklärt und zum Ausprobieren:</span>
              {concept.map((c) => (
                <a key={c!.id} className="chip chip--link" href={href(`/grundlagen/${c!.id}`)}>
                  {c!.title}
                </a>
              ))}
            </section>
          )}

          <nav className="st-pager wrap" aria-label="Vorige und nächste Station">
            {prev ? (
              <a className="pager pager--prev" href={href(`/reise/${prev.station.id}`)} rel="prev">
                <span className="eyebrow">
                  <ArrowLeft width={16} height={16} /> Zurück
                </span>
                <span className="pager-title">{prev.station.short}</span>
                <span className="pager-sub">{prev.station.year}</span>
              </a>
            ) : (
              <a className="pager pager--prev" href={href('/')}>
                <span className="eyebrow">
                  <ArrowLeft width={16} height={16} /> Zurück
                </span>
                <span className="pager-title">Zum Anfang</span>
              </a>
            )}
            {next ? (
              <a className="pager pager--next" href={href(`/reise/${next.station.id}`)} rel="next">
                <span className="eyebrow">
                  Weiter <ArrowRight width={16} height={16} />
                </span>
                <span className="pager-title">{next.station.teaser ?? next.station.short}</span>
                <span className="pager-sub">{next.station.year} · {next.composer.name}</span>
              </a>
            ) : (
              <a className="pager pager--next pager--end" href={href('/entdeckungen')}>
                <span className="eyebrow">
                  Ende der Reise <ArrowRight width={16} height={16} />
                </span>
                <span className="pager-title">Deine Entdeckungen</span>
                <span className="pager-sub">Rückblick &amp; gemerkte Werke</span>
              </a>
            )}
          </nav>
        </article>
      </main>
      <Timeline stations={resolvedStations} activeIndex={index} />
    </>
  );
}
