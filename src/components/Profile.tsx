import type { Profile as ProfileT } from '../lib/types';

export const dimensions: { key: keyof ProfileT; label: string; left: string; right: string; hint: string }[] = [
  { key: 'zuhause', label: 'Zuhause', left: 'klares Zuhause', right: 'Zuhause verloren', hint: 'Spürt man, wo die Musik hingehört?' },
  { key: 'apparat', label: 'Größe', left: 'wenige Spieler', right: 'riesiges Orchester', hint: 'Wie viele Menschen und Instrumente spielen mit?' },
  { key: 'puls', label: 'Schlag', left: 'gleichmäßig', right: 'unberechenbar', hint: 'Kann man mitklopfen, ohne zu stolpern?' },
  { key: 'reibung', label: 'Schärfe', left: 'weich', right: 'schräg und scharf', hint: 'Wie viel Reibung und Spannung hält die Musik aus?' },
  { key: 'fliesst', label: 'Melodie oder Klang', left: 'Melodie zum Mitsingen', right: 'Klangteppich', hint: 'Gibt es eine Linie zum Mitsingen – oder eine schwebende Klangmasse?' },
];

interface Props {
  profile: ProfileT;
  previous?: ProfileT;
  previousLabel?: string;
}

/** Fünf qualitative Regler. Der blasse Punkt zeigt die vorige Station – der Weg dorthin ist die Aussage. */
export function ProfileBars({ profile, previous, previousLabel }: Props) {
  return (
    <div className="profile" role="group" aria-label="So klingt diese Station (grobe Einschätzung)">
      {dimensions.map((d) => {
        const v = profile[d.key];
        const p = previous?.[d.key];
        const moved = p !== undefined ? v - p : 0;
        return (
          <div className="profile-row" key={d.key}>
            <div className="profile-label">
              <span className="profile-name">{d.label}</span>
              {Math.abs(moved) > 0.12 && (
                <span className="profile-delta">
                  {moved > 0 ? '→ ' : '← '}
                  {moved > 0 ? 'weiter zu' : 'zurück zu'} {moved > 0 ? d.right : d.left}
                </span>
              )}
            </div>
            <div className="profile-track" aria-hidden="true">
              {p !== undefined && (
                <>
                  <span className="profile-ghost" style={{ left: `${p * 100}%` }} title={previousLabel} />
                  <span
                    className="profile-trail"
                    style={{ left: `${Math.min(p, v) * 100}%`, width: `${Math.abs(v - p) * 100}%` }}
                  />
                </>
              )}
              <span className="profile-dot" style={{ left: `${v * 100}%` }} />
            </div>
            <div className="profile-poles" aria-hidden="true">
              <span>{d.left}</span>
              <span>{d.right}</span>
            </div>
            <span className="sr-only">
              {d.label}: zwischen „{d.left}“ und „{d.right}“, Position {Math.round(v * 100)} Prozent.
            </span>
          </div>
        );
      })}
    </div>
  );
}
