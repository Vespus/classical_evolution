import type { Forces as ForcesT } from '../lib/types';

const groups: { key: keyof ForcesT; label: string }[] = [
  { key: 'streicher', label: 'Streicher' },
  { key: 'holz', label: 'Holzbläser' },
  { key: 'blech', label: 'Blech' },
  { key: 'schlagwerk', label: 'Schlagwerk' },
  { key: 'tasten', label: 'Tasten' },
  { key: 'stimme', label: 'Stimme' },
];

const levelWord = ['nicht beteiligt', 'dabei', 'prägend', 'dominierend'];

/** Wer spielt mit? Sechs Klangfamilien als Punktreihen. */
export function Forces({ forces }: { forces: ForcesT }) {
  return (
    <ul className="forces" aria-label="Besetzung">
      {groups.map((g) => {
        const l = forces[g.key];
        return (
          <li key={g.key} className={`force force--${l}`}>
            <span className="force-dots" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <i key={i} className={i <= l ? 'on' : ''} />
              ))}
            </span>
            <span className="force-name">{g.label}</span>
            <span className="sr-only">: {levelWord[l]}</span>
          </li>
        );
      })}
    </ul>
  );
}
