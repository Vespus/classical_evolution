/* Zusammenführung der Datenquellen. Inhalte liegen ausschließlich in src/data/*.json. */
import type { Comparison, Composer, Concept, ImageRecord, Period, Recording, Station, Work } from '../lib/types';
import periodsJson from './periods.json';
import composersJson from './composers.json';
import worksJson from './works.json';
import recordingsJson from './recordings.json';
import imagesJson from './images.json';
import stationsJson from './stations.json';
import comparisonsJson from './comparisons.json';
import conceptsJson from './concepts.json';
import peaksJson from './peaks.json';
import landscapeJson from './landscape.json';

export const periods = periodsJson as Period[];
export const composers = composersJson as Composer[];
export const works = worksJson as Work[];
export const recordings = recordingsJson as Recording[];
export const images = imagesJson as ImageRecord[];
export const stations = (stationsJson as Station[]).slice().sort((a, b) => a.order - b.order);
export const comparisons = comparisonsJson as Comparison[];
export const concepts = conceptsJson as Concept[];
export const landscapeNotes = landscapeJson as { dim: string; stationId: string; text: string }[];
export const peaks = peaksJson as Record<string, number[]>;

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));

const composerMap = byId(composers);
const workMap = byId(works);
const recordingMap = byId(recordings);
const imageMap = byId(images);
const stationMap = byId(stations);
const periodMap = byId(periods);
const comparisonMap = byId(comparisons);

export const getComposer = (id: string) => composerMap.get(id);
export const getWork = (id: string) => workMap.get(id);
export const getRecording = (id: string) => recordingMap.get(id);
export const getImage = (id?: string) => (id ? imageMap.get(id) : undefined);
export const getStation = (id: string) => stationMap.get(id);
export const getPeriod = (id: string) => periodMap.get(id);
export const getComparison = (id: string) => comparisonMap.get(id);

export interface Resolved {
  station: Station;
  work: Work;
  composer: Composer;
  recording: Recording;
  period: Period;
}

export function resolveStation(station: Station): Resolved {
  const work = workMap.get(station.workId)!;
  return {
    station,
    work,
    composer: composerMap.get(work.composerId)!,
    recording: recordingMap.get(station.recordingId)!,
    period: periodMap.get(station.periodId)!,
  };
}

export const resolvedStations: Resolved[] = stations.map(resolveStation);

export function resolveRecording(recordingId: string) {
  const recording = recordingMap.get(recordingId)!;
  const work = workMap.get(recording.workId)!;
  return { recording, work, composer: composerMap.get(work.composerId)! };
}

/** „Beethoven · 5. Sinfonie“ */
export function workLabel(workId: string) {
  const w = workMap.get(workId);
  if (!w) return '';
  const c = composerMap.get(w.composerId);
  return `${c?.name.split(' ').slice(-1)[0] ?? ''} · ${w.title}${w.part ? ', ' + w.part : ''}`;
}

export const audioUrl = (rel: string) => import.meta.env.BASE_URL + rel.replace(/^\//, '');
