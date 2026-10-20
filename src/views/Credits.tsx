import { recordings, images, getWork, getComposer } from '../data';

export function Credits() {
  return (
    <main id="main" tabIndex={-1} className="page wrap credits">
      <header className="page-head">
        <p className="eyebrow">Quellen &amp; Lizenzen</p>
        <h1>Woher die Klänge und Bilder stammen.</h1>
        <p className="lead">
          Ein Musikstück darf frei sein, die Aufnahme davon ist es deshalb noch nicht. Darum steht hier für jede Aufnahme einzeln: Quelle, Interpret, Lizenz und
          Namensnennung. Die selbst gespeicherten Ausschnitte wurden aus den Originalen geschnitten und mit kurzem Ein- und Ausblenden versehen. Die Videos
          laufen direkt bei YouTube; sie gehören den genannten Orchestern und Ensembles.
        </p>
      </header>

      <section aria-labelledby="c-audio">
        <h2 id="c-audio">Aufnahmen</h2>
        <div className="table-wrap">
          <table className="credit-table">
            <thead>
              <tr>
                <th scope="col">Werk</th>
                <th scope="col">Interpret</th>
                <th scope="col">Quelle &amp; Lizenz</th>
                <th scope="col">Nachweis</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((r) => {
                const w = getWork(r.workId)!;
                const c = getComposer(w.composerId)!;
                return (
                  <tr key={r.id}>
                    <th scope="row">
                      {c.name}: {w.title}
                      {w.part ? `, ${w.part}` : ''}
                      <span className="credit-year">{w.year}</span>
                    </th>
                    <td>
                      {r.performer}
                      {r.recordedYear ? <span className="credit-year">Aufnahme {r.recordedYear}</span> : null}
                    </td>
                    <td>
                      <a href={r.sourceUrl} target="_blank" rel="noreferrer noopener">
                        {r.source}
                      </a>
                      <br />
                      <a href={r.license.url} target="_blank" rel="noreferrer noopener">
                        {r.license.name}
                      </a>
                      {r.provider === 'external' && <span className="credit-year">Externer Player · nicht im Projekt gespeichert</span>}
                    </td>
                    <td className="credit-attr">{r.attribution}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="c-img">
        <h2 id="c-img">Bilder</h2>
        <div className="table-wrap">
          <table className="credit-table">
            <thead>
              <tr>
                <th scope="col">Bild</th>
                <th scope="col">Urheber / Datierung</th>
                <th scope="col">Quelle &amp; Lizenz</th>
              </tr>
            </thead>
            <tbody>
              {images.map((i) => (
                <tr key={i.id}>
                  <th scope="row">{i.title}</th>
                  <td>
                    {i.creator}
                    <span className="credit-year">{i.date}</span>
                  </td>
                  <td>
                    <a href={i.sourceUrl} target="_blank" rel="noreferrer noopener">
                      {i.source}
                    </a>
                    <br />
                    <a href={i.license.url} target="_blank" rel="noreferrer noopener">
                      {i.license.name}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="c-law">
        <h2 id="c-law">Rechtliche Hinweise</h2>
        <ul className="plain">
          <li>
            <strong>Aufnahmen im Projekt</strong> stehen unter den oben genannten Lizenzen. Bei „CC BY-SA“ gilt dieselbe Lizenz für die hier gezeigten Ausschnitte
            (Bearbeitung: Kürzung, Ein- und Ausblenden, Kodierung).
          </li>
          <li>
            <strong>Historische Aufnahmen</strong> sind nur aufgeführt, wenn sie sowohl nach US-amerikanischem als auch nach europäischem Recht gemeinfrei sind.
          </li>
          <li>
            <strong>Externe Player</strong> (YouTube, datenschutzfreundlicher Modus) werden nur für Musik verwendet, die nicht frei verfügbar ist. Sie laden erst nach Klick.
            Die Einbettung offizieller Kanäle ersetzt keine Lizenz für eine eigene Veröffentlichung dieser Aufnahmen.
          </li>
          <li>
            <strong>Kompositionen</strong> von Urhebern, die noch keine siebzig Jahre tot sind (u. a. Strawinsky, Messiaen, Ligeti), sind in Europa noch geschützt. Sie
            werden deshalb ausschließlich über die externen Player eingebunden.
          </li>
          <li>
            <strong>Schriften:</strong> Newsreader und Inter, jeweils unter der SIL Open Font License 1.1 (über Fontsource).
          </li>
          <li>
            <strong>Texte</strong> und Einschätzungen der Klangprofile sind redaktionell und ausdrücklich vereinfacht.
          </li>
        </ul>
      </section>
    </main>
  );
}
