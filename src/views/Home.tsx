import { comparisons, resolvedStations, getImage } from '../data';
import { HeroField } from '../components/HeroField';
import { Zeitraffer } from '../components/Zeitraffer';
import { ArrowRight } from '../components/Icons';
import { href } from '../lib/router';
import { useLastStation, useVisited } from '../lib/storage';

export function Home() {
  const last = useLastStation();
  const visited = useVisited();
  const first = resolvedStations[0];
  const resume = resolvedStations.find((r) => r.station.id === last && r.station.id !== first.station.id);

  return (
    <main id="main" tabIndex={-1} className="home">
      <section className="hero" data-theme="nacht" aria-labelledby="hero-title">
        <HeroField />
        <div className="hero-inner wrap">
          <p className="eyebrow hero-eyebrow">Klangwandel</p>
          <h1 id="hero-title" className="hero-title">
            <span>250 Jahre Musik.</span>
            <span>Und irgendwann verschwindet die Tonart.</span>
          </h1>
          <p className="hero-sub">Eine Zeitreise zum Hören.</p>
          <div className="hero-cta">
            <a className="btn btn--hero" href={href(`/reise/${first.station.id}`)}>
              Reise beginnen <ArrowRight width={20} height={20} />
            </a>
            {resume && (
              <a className="btn btn--hero-ghost" href={href(`/reise/${resume.station.id}`)}>
                Weiter bei {resume.station.short}
              </a>
            )}
          </div>
          <Zeitraffer />
        </div>
        <a className="hero-scroll" href="#idea" onClick={(e) => { e.preventDefault(); document.getElementById('idea')?.scrollIntoView({ behavior: 'smooth' }); }}>
          <span className="sr-only">Weiter lesen</span>
          <i aria-hidden="true" />
        </a>
      </section>

      <section id="idea" className="home-idea wrap">
        <p className="eyebrow">Worum es geht</p>
        <div className="idea-grid">
          <h2>Dasselbe Wort, sehr verschiedene Klänge.</h2>
          <div>
            <p>
              „Klassische Musik“ klingt in den Ohren vieler nach einem einzigen Ton: Violinen, Kerzenlicht, gepflegte Langeweile. Tatsächlich liegen zwischen einem
              Haydn-Quartett und Ligetis Klangflächen kaum zwei Lebensalter – und dazwischen ereignet sich, hörbar und Schritt für Schritt, einer der erstaunlichsten
              Umbauten der Kulturgeschichte.
            </p>
            <p>
              Diese Reise erklärt nicht, was man bei Konzerten zu empfinden hat. Sie lässt Sie hören, wo etwas kippt: in der Energie, in der Harmonik, in der Größe des
              Orchesters, im Rhythmus. Nach jeder Station sehen Sie, was sich gegenüber der vorigen verändert hat – und was nicht.
            </p>
          </div>
        </div>
      </section>

      <section className="home-ways wrap" aria-labelledby="ways-h">
        <h2 id="ways-h" className="sr-only">Drei Arten zu hören</h2>
        <a className="way" href={href(`/reise/${first.station.id}`)}>
          <span className="eyebrow">Die Reise</span>
          <strong>{resolvedStations.length} Stationen</strong>
          <span>Vom Barock bis in die Gegenwart, jede mit Hörbeispiel, drei Hörhinweisen und der Frage: Was ist neu?</span>
          <ArrowRight width={20} height={20} />
        </a>
        <a className="way" href={href('/vergleich')}>
          <span className="eyebrow">Hör den Unterschied</span>
          <strong>{comparisons.length} Vergleiche</strong>
          <span>Zwei Stücke, zwei Tasten: A, B, A, B. Das Ohr entscheidet schneller als jeder Text.</span>
          <ArrowRight width={20} height={20} />
        </a>
        <a className="way" href={href('/landschaft')}>
          <span className="eyebrow">Die Landschaft</span>
          <strong>Fünf Regler</strong>
          <span>Tonart, Orchester, Puls, Reibung, Fläche – der Wandel auf einen Blick, mit Umwegen.</span>
          <ArrowRight width={20} height={20} />
        </a>
      </section>

      <section className="home-path wrap" aria-labelledby="path-h">
        <div className="path-head">
          <p className="eyebrow">Die Route</p>
          <h2 id="path-h">Von Bach bis in die Gegenwart.</h2>
        </div>
        <ol className="path">
          {resolvedStations.map((r, i) => {
            const img = getImage(r.station.imageId);
            const seen = visited.includes(r.station.id);
            return (
              <li key={r.station.id} data-theme={r.station.theme}>
                <a href={href(`/reise/${r.station.id}`)} className={seen ? 'is-seen' : ''}>
                  <span className="path-thumb" aria-hidden="true">
                    {img && <img src={import.meta.env.BASE_URL + img.file} alt="" loading="lazy" decoding="async" width={img.width} height={img.height} style={img.focus ? { objectPosition: img.focus } : undefined} />}
                  </span>
                  <span className="path-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="path-body">
                    <span className="path-year">{r.station.year}</span>
                    <strong>{r.composer.name.split(' ').slice(-1)[0]}</strong>
                    <span className="path-line">{r.station.teaser ?? r.station.headline}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="home-end wrap">
        <p>Keine Hintergrundmusik, kein Konto, nichts startet von selbst. Es klingt nur, was Sie anklicken – und immer nur eines.</p>
        <a className="btn" href={href(`/reise/${first.station.id}`)}>
          Reise beginnen <ArrowRight width={18} height={18} />
        </a>
      </section>
    </main>
  );
}
