import { useEffect } from 'react';
import { concepts, resolvedStations } from '../data';
import { DEMOS } from '../components/demos';
import { href } from '../lib/router';
import { stopSynth } from '../lib/synth';
import { ArrowRight } from '../components/Icons';

export function Basics({ focusId }: { focusId?: string }) {
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`c-${focusId}`);
    if (el) {
      window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      el.focus({ preventScroll: true });
    }
  }, [focusId]);
  useEffect(() => () => stopSynth(), []);

  return (
    <main id="main" tabIndex={-1} className="page basics">
      <header className="wrap page-head">
        <p className="eyebrow">Was höre ich da eigentlich?</p>
        <h1>Zehn Wörter, die man hören kann.</h1>
        <p className="lead">
          Freiwillig und kurz. Erst hören und ausprobieren, dann erst das Fachwort. Die Klänge hier kommen aus dem Computer und sind bewusst einfach.
          Sie ersetzen kein Orchester, sie zeigen nur, worum es geht.
        </p>
        <nav className="basics-nav" aria-label="Begriffe">
          {concepts.map((c) => (
            <a key={c.id} className="chip chip--link" href={href(`/grundlagen/${c.id}`)}>{c.title}</a>
          ))}
        </nav>
      </header>

      <div className="wrap concept-grid">
        {concepts.map((c, i) => {
          const Demo = DEMOS[c.demo];
          const where = resolvedStations.filter((r) => r.station.conceptIds?.includes(c.id)).slice(0, 3);
          return (
            <section key={c.id} id={`c-${c.id}`} tabIndex={-1} className={`concept ${focusId === c.id ? 'is-focus' : ''}`} aria-labelledby={`h-${c.id}`}>
              <p className="concept-n eyebrow">{String(i + 1).padStart(2, '0')}</p>
              <h2 id={`h-${c.id}`}>{c.title}</h2>
              <p className="concept-q">{c.question}</p>
              <p>{c.text}</p>
              <p className="swift-line"><strong>Und Taylor Swift?</strong> {c.swift}</p>
              {c.term && <p className="term"><span className="term-word">Fachwort</span> {c.term}</p>}
              {Demo && <Demo />}
              {where.length > 0 && (
              <p className="concept-where">
                  Kommt vor bei: {where.map((r, k) => (
                    <span key={r.station.id}>
                      {k > 0 && ', '}
                      <a href={href(`/reise/${r.station.id}`)}>{r.station.short}</a>
                    </span>
                  ))}
                </p>
              )}
            </section>
          );
        })}
      </div>

      <div className="wrap basics-end">
        <a className="btn" href={href('/reise')}>
          Zurück zur Reise <ArrowRight width={18} height={18} />
        </a>
      </div>
    </main>
  );
}
