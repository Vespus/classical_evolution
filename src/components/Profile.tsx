import type { Profile as ProfileT } from '../lib/types';

export const dimensions: { key: keyof ProfileT; label: string; left: string; right: string; hint: string }[] = [
  { key: 'zuhause', label: 'Tonart', left: 'ein klares Zuhause', right: 'Zuhause aufgelöst', hint: 'Wie deutlich ist, wo die Musik „hingehört“?' },
  { key: 'apparat', label: 'Klangapparat', left: 'kleiner Kreis', right: 'riesiger Apparat', hint: 'Wie viele Stimmen und Instrumente klingen mit?' },
  { key: 'puls', label: 'Puls', left: 'gleichmäßig', right: 'frei, unberechenbar', hint: 'Lässt sich mitklopfen, ohne zu stolpern?' },
  { key: 'reibung', label: 'Reibung', left: 'reibungslos', right: 'scharf dissonant', hint: 'Wie viel Schärfe und Spannung wird ausgehalten?' },
  { key: 'fliesst', label: 'Gestalt', left: 'Melodie im Vordergrund', right: 'Klangfläche', hint: 'Singbare Linie oder schwebende Klangmasse?' },
];

interface Props {
  profile: ProfileT;
  previous?: ProfileT;
  previousLabel?: string;
}

/** Fünf qualitative Regler. Der blasse Punkt zeigt die vorige Station – der Weg dorthin ist die Aussage. */
export function ProfileBars({ profile, previous, previousLabel }: Props) {
  return (
    <div className="profile" role="group" aria-label="Klangprofil dieser Station (qualitative Einschätzung)">
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
