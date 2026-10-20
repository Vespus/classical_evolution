import { toggleFavorite, useFavorites } from '../lib/storage';
import { BookmarkIcon } from './Icons';

export function BookmarkButton({ stationId, label }: { stationId: string; label: string }) {
  const favs = useFavorites();
  const on = favs.some((f) => f.stationId === stationId);
  return (
    <button type="button" className={`chip chip--bookmark ${on ? 'is-on' : ''}`} onClick={() => toggleFavorite(stationId)} aria-pressed={on}>
      <BookmarkIcon width={16} height={16} filled={on} />
      {on ? 'Gemerkt' : 'Für später merken'}
      <span className="sr-only"> – {label}</span>
    </button>
  );
}
