import { useEffect } from 'react';
import { getStation, resolvedStations } from './data';
import { href, usePath } from './lib/router';
import { useFavorites } from './lib/storage';
import { MiniPlayer } from './components/MiniPlayer';
import { Home } from './views/Home';
import { Journey } from './views/Journey';
import { Compare } from './views/Compare';
import { Landscape } from './views/Landscape';
import { Basics } from './views/Basics';
import { Discoveries } from './views/Discoveries';
import { Credits } from './views/Credits';

const NAV = [
  { to: '/reise', label: 'Reise', match: '/reise' },
  { to: '/vergleich', label: 'Hör den Unterschied', match: '/vergleich' },
  { to: '/landschaft', label: 'Landschaft', match: '/landschaft' },
  { to: '/grundlagen', label: 'Was höre ich da?', match: '/grundlagen' },
];

function parse(path: string) {
  const parts = path.split('/').filter(Boolean);
  return { section: parts[0] ?? '', id: parts[1] };
}

export function App() {
  const path = usePath();
  const { section, id } = parse(path);
  const favorites = useFavorites();

  let theme: string | undefined;
  if (section === 'reise') {
    const st = (id && getStation(id)) || undefined;
    theme = st?.theme;
  }

  // Seitentitel pro Ansicht
  useEffect(() => {
    const names: Record<string, string> = {
      '': 'Eine Zeitreise zum Hören',
      reise: 'Die Reise',
      vergleich: 'Hör den Unterschied',
      landschaft: 'Die Landschaft',
      grundlagen: 'Was höre ich da eigentlich?',
      entdeckungen: 'Deine Entdeckungen',
      quellen: 'Quellen & Lizenzen',
    };
    const st = section === 'reise' && id ? getStation(id) : undefined;
    document.title = `${st ? st.short + ' – ' : ''}${names[section] ?? 'Seite nicht gefunden'} · Klangwandel`;
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = getComputedStyle(document.querySelector('.app')!).getPropertyValue('--bg').trim();
    if (meta && bg) meta.setAttribute('content', bg);
  }, [section, id, theme]);

  const hideMini = section === 'reise' || section === 'vergleich' || section === '';

  let view: React.ReactNode;
  switch (section) {
    case '':
      view = <Home />;
      break;
    case 'reise':
      view = <Journey stationId={id} />;
      break;
    case 'vergleich':
      view = <Compare comparisonId={id} />;
      break;
    case 'landschaft':
      view = <Landscape />;
      break;
    case 'grundlagen':
      view = <Basics focusId={id} />;
      break;
    case 'entdeckungen':
      view = <Discoveries />;
      break;
    case 'quellen':
      view = <Credits />;
      break;
    default:
      view = (
        <main id="main" className="wrap page notfound">
          <h1>Diese Seite gibt es nicht.</h1>
          <p>Vielleicht führt die Reise dorthin, wo Sie gerade hinwollten.</p>
          <p>
            <a className="btn" href={href('/')}>
              Zum Anfang
            </a>
          </p>
        </main>
      );
  }

  const dark = ['romantik', 'fruehromantik', 'spaetromantik', 'expressionismus', 'nachkrieg', 'nacht'].includes(theme ?? '');

  return (
    <div className="app" data-theme={theme} data-section={section || 'home'} data-dark={dark ? '' : undefined}>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Zum Inhalt springen
      </a>
      <header className={`topbar ${section === '' ? 'topbar--home' : ''}`}>
        <a className="brand" href={href('/')} aria-label="Klangwandel – zur Startseite">
          <span className="brand-mark" aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
          Klangwandel
        </a>
        <nav className="topnav" aria-label="Hauptnavigation">
          {NAV.map((n) => (
            <a key={n.to} href={href(n.to)} aria-current={section === n.match.slice(1) ? 'page' : undefined}>
              {n.label}
            </a>
          ))}
          <a href={href('/entdeckungen')} aria-current={section === 'entdeckungen' ? 'page' : undefined} className="topnav-fav">
            Entdeckungen{favorites.length > 0 && <span className="count" aria-label={`${favorites.length} gemerkt`}>{favorites.length}</span>}
          </a>
        </nav>
      </header>
      {view}
      {section !== 'reise' && (
        <footer className="footer">
          <div className="wrap footer-inner">
            <p>
              <strong>Klangwandel</strong> · {resolvedStations.length} Stationen, eine Richtung — und einige Umwege.
            </p>
            <p>
              <a href={href('/quellen')}>Quellen &amp; Lizenzen</a> · <a href={href('/entdeckungen')}>Deine Entdeckungen</a> ·{' '}
              <a href={href('/grundlagen')}>Was höre ich da eigentlich?</a>
            </p>
            <p className="footer-small">Alles bleibt in Ihrem Browser. Kein Konto, kein Tracking, keine Musik, die von selbst anfängt.</p>
          </div>
        </footer>
      )}
      <MiniPlayer hidden={hideMini} />
    </div>
  );
}
