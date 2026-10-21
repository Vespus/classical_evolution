import { useEffect, useState } from 'react';

/**
 * Eigene Medien: Liegt im Ordner `media/` neben der Seite eine Datei, die wie die Aufnahme heißt
 * (z. B. `media/rec-beethoven.mp4`), wird sie statt des Standard-Players verwendet.
 * Ohne passende Datei bleibt alles beim Alten. Gesucht wird erst, wenn eine Aufnahme angezeigt wird.
 */
export interface MediaOverride {
  kind: 'audio' | 'video';
  url: string;
}

const CANDIDATES: [string, MediaOverride['kind']][] = [
  ['mp4', 'video'],
  ['webm', 'video'],
  ['mp3', 'audio'],
  ['m4a', 'audio'],
  ['ogg', 'audio'],
  ['opus', 'audio'],
];

const cache = new Map<string, Promise<MediaOverride | null>>();

async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    // Manche Server liefern für Unbekanntes die Startseite mit 200 zurück – das zählt nicht.
    return res.ok && !/text\/html/i.test(res.headers.get('content-type') ?? '');
  } catch {
    return false;
  }
}

export function findMedia(recordingId: string): Promise<MediaOverride | null> {
  let p = cache.get(recordingId);
  if (!p) {
    p = Promise.all(
      CANDIDATES.map(async ([ext, kind]) => {
        const url = `${import.meta.env.BASE_URL}media/${recordingId}.${ext}`;
        return (await exists(url)) ? ({ kind, url } as MediaOverride) : null;
      }),
    ).then((found) => found.find(Boolean) ?? null);
    cache.set(recordingId, p);
  }
  return p;
}

/** null = keine eigene Datei (oder noch nicht geprüft) */
export function useMediaOverride(recordingId: string): MediaOverride | null {
  const [found, setFound] = useState<{ id: string; media: MediaOverride | null } | null>(null);
  useEffect(() => {
    let alive = true;
    findMedia(recordingId).then((media) => alive && setFound({ id: recordingId, media }));
    return () => {
      alive = false;
    };
  }, [recordingId]);
  return found && found.id === recordingId ? found.media : null;
}
