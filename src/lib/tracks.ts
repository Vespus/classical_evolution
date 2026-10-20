import type { Composer, Recording, Work } from './types';
import type { Track } from './audio';
import { audioUrl } from '../data';

export function clipTrack(recording: Recording, work: Work, composer: Composer): Track {
  return {
    id: recording.id,
    src: audioUrl(recording.local!.clip),
    title: `${composer.name.split(' ').slice(-1)[0]}: ${work.title}${work.part ? ', ' + work.part : ''}`,
    subtitle: recording.performer,
    start: 0,
    kind: 'clip',
    fallbackUrl: recording.sourceUrl,
  };
}

export function fullTrack(recording: Recording, work: Work, composer: Composer): Track | null {
  if (!recording.local?.fullStreamUrl) return null;
  return {
    id: recording.id + ':full',
    src: recording.local.fullStreamUrl,
    title: `${composer.name.split(' ').slice(-1)[0]}: ${work.title}${work.part ? ', ' + work.part : ''}`,
    subtitle: `${recording.performer} · ganze Aufnahme`,
    start: recording.local.fullStart ?? 0,
    end: recording.local.fullEnd,
    kind: 'full',
    fallbackUrl: recording.sourceUrl,
  };
}
