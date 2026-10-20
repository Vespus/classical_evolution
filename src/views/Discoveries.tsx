import { useState } from 'react';
import { resolvedStations, getStation, resolveStation } from '../data';
import { clearFavorites, resetVisited, toggleFavorite, useFavorites, useVisited } from '../lib/storage';
import { href } from '../lib/router';
import { ArrowRight, BookmarkIcon, ExternalIcon } from '../components/Icons';

export function Discoveries() {
  const favorites = useFavorites();
  const visited = useVisited();
  const [copied, setCopied] = useState(false);
  const items = favorites
    .map((f) => ({ f, st: getStation(f.stationId) }))
    .filter((x): x is { f: (typeof favorites)[number]; st: NonNullable<typeof x.st> } => !!x.st)
    .map(({ f, st }) => ({ f, r: resolveStation(st) }));

  const copy = async () => {
    const text = items
      .map(({ r }) => `${r.composer.name}: ${r.work.title}${r.work.part ? ', ' + r.work.part : ''} (${r.work.year}) – ${r.work.fullListenUrl}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt('Liste zum Kopieren:', text);
    }
  };

  return (
    <main id="main" tabIndex={-1} className="page wrap discoveries">
      <header className="page-head">
        <p className="eyebrow">Deine Entdeckungen</p>
        <h1>{items.length > 0 ? 'Das wollten Sie noch einmal hören.' : 'Noch nichts gemerkt.'}</h1>
        <p className="lead">
          {items.length > 0
            ? 'Die Liste wird nur in diesem Browser gespeichert. Bei jedem Stück finden Sie einen Link zur ganzen Aufnahme.'
            : 'Bei jeder Station gibt es „Für später merken“. Hier sammelt sich, was Sie noch einmal in Ruhe hören möchten. Kein Konto nötig.'}
        </p>
      </header>

      {items.length > 0 && (
        <ul className="disc-list">
          {items.map(({ r }) => (
            <li key={r.station.id} className="disc-item" data-theme={r.station.theme}>
              <div className="disc-main">
                <p className="eyebrow">
                  {r.period.name} · {r.work.year}
                </p>
                <h2>
                  {r.composer.name}: {r.work.title}
                  {r.work.part ? `, ${r.work.part}` : ''}
                </h2>
                <p className="disc-sub">{r.station.headline}</p>
              </div>
              <div className="disc-actions">
                <a className="btn" href={r.work.fullListenUrl} target="_blank" rel="noreferrer noopener">
                  {r.work.fullListenLabel} <ExternalIcon width={16} height={16} />
                </a>
                <a className="btn btn--ghost" href={href(`/reise/${r.station.id}`)}>
                  Zur Station
                </a>
                <button type="button" className="chip" onClick={() => toggleFavorite(r.station.id)} aria-label={`${r.work.title} aus der Liste entfernen`}>
                  <BookmarkIcon width={16} height={16} filled /> Entfernen
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <p className="disc-tools">
          <button type="button" className="btn btn--ghost" onClick={copy}>
            {copied ? 'Kopiert ✓' : 'Liste kopieren'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              if (window.confirm('Alle gemerkten Stücke aus der Liste löschen?')) clearFavorites();
            }}
          >
            Liste leeren
          </button>
        </p>
      )}

      <section className="disc-recap">
        <h2>Ihre Reise</h2>
        <p>
          Sie waren an <strong>{visited.filter((id) => getStation(id)).length}</strong> von {resolvedStations.length} Stationen.
        </p>
        <ol className="disc-dots" aria-label="Besuchte Stationen">
          {resolvedStations.map((r) => (
            <li key={r.station.id} className={visited.includes(r.station.id) ? 'on' : ''}>
              <a href={href(`/reise/${r.station.id}`)}>
                <span className="dot" aria-hidden="true" />
                {r.station.short}
              </a>
            </li>
          ))}
        </ol>
        <p>
          <a className="btn" href={href('/reise')}>
            Weiterreisen <ArrowRight width={18} height={18} />
          </a>{' '}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              if (window.confirm('Die Markierung besuchter Stationen zurücksetzen?')) resetVisited();
            }}
          >
            Zurücksetzen
          </button>
        </p>
      </section>
    </main>
  );
}
