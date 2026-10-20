/* Zentrale Datentypen. Die Inhalte selbst liegen in src/data/*.json. */

export type PeriodId =
  | 'barock'
  | 'klassik'
  | 'romantik'
  | 'spaetromantik'
  | 'moderne'
  | 'nachkrieg'
  | 'gegenwart';

export interface Period {
  id: PeriodId;
  name: string;
  years: string;
  /** Eine Zeile: Was hört man hier typischerweise? */
  tagline: string;
  from: number;
  to: number;
}

export interface Composer {
  id: string;
  name: string;
  born: number;
  died: number | null;
  country: string;
  /** Verweis auf images.json */
  image?: string;
}

export interface Work {
  id: string;
  composerId: string;
  title: string;
  /** Kurzer Zusatz, z. B. „1. Satz“ */
  part?: string;
  year: number;
  yearNote?: string;
  /** Gattung in einfachen Worten */
  kind: string;
  /** Link zu einer vollständigen, legal anhörbaren Aufnahme (Weiterhören) */
  fullListenUrl: string;
  fullListenLabel: string;
}

export interface License {
  name: string;
  url: string;
}

export interface Recording {
  id: string;
  workId: string;
  /** Interpret / Ensemble */
  performer: string;
  /** Aufnahmejahr, falls bekannt */
  recordedYear?: string;
  /**
   * local    – freie Lizenz, als kurzer Ausschnitt im Projekt gespeichert
   * external – Werk oder Aufnahme nicht frei: Einbettung eines offiziellen Streams (erst nach Klick geladen)
   */
  provider: 'local' | 'external';
  source: string;
  /** Seite der Quelle (Dateiseite bzw. Videoseite) */
  sourceUrl: string;
  license: License;
  /** Wortlaut für die Namensnennung */
  attribution: string;
  /** Hinweis zur Klangqualität, falls historisch */
  qualityNote?: string;
  local?: {
    /** Originaldatei */
    fileUrl: string;
    /** Lokaler Ausschnitt relativ zu public/ */
    clip: string;
    /** Ausschnitt innerhalb der Originaldatei in Sekunden */
    clipStart: number;
    clipEnd: number;
    /** Längere Fassung (ganzer Satz) im Netz, nur als Zusatzfunktion */
    fullStreamUrl?: string;
    /** Beginn / Ende des „ganzen Satzes“ innerhalb der Streamdatei (Sekunden), falls die Datei mehr enthält */
    fullStart?: number;
    fullEnd?: number;
  };
  external?: {
    kind: 'youtube';
    videoId: string;
    start: number;
    end: number;
    /** Titel und Kanal laut oEmbed-Prüfung */
    title: string;
    channel: string;
    checked: string;
  };
}

export interface ImageRecord {
  id: string;
  file: string;
  alt: string;
  title: string;
  creator: string;
  date: string;
  source: string;
  sourceUrl: string;
  license: License;
  attribution: string;
  width: number;
  height: number;
  /** CSS object-position */
  focus?: string;
}

/** Besetzungsgruppen – 0 = nicht beteiligt, 1 = dabei, 2 = prägend, 3 = dominierend */
export type ForceLevel = 0 | 1 | 2 | 3;
export interface Forces {
  streicher: ForceLevel;
  holz: ForceLevel;
  blech: ForceLevel;
  schlagwerk: ForceLevel;
  tasten: ForceLevel;
  stimme: ForceLevel;
}

/** Qualitatives Profil. Werte 0–1 sind redaktionelle Einschätzungen, keine Messwerte. */
export interface Profile {
  zuhause: number; // 0 = Tonart klar verankert … 1 = aufgelöst
  apparat: number; // 0 = kleiner Kreis … 1 = riesiger Apparat
  puls: number; // 0 = gleichmäßiger Puls … 1 = frei / unberechenbar
  reibung: number; // 0 = reibungslos … 1 = scharf dissonant
  fliesst: number; // 0 = Melodie im Vordergrund … 1 = Klangfläche
}

export interface Station {
  id: string;
  order: number;
  periodId: PeriodId;
  /** Farbwelt (siehe styles/tokens.css) */
  theme: string;
  /** Kurzname für die Zeitleiste */
  short: string;
  /** Neugierig machende Zeile auf dem „Weiter“-Knopf der Vorgängerstation */
  teaser?: string;
  /** Jahr, an dem der Marker auf der Zeitleiste sitzt */
  year: number;
  /** Große Überschrift der Station – eine Behauptung, kein Etikett */
  headline: string;
  kicker: string;
  workId: string;
  recordingId: string;
  /** Bild der Station (Porträt, Manuskript, Ort …) */
  imageId?: string;
  /** Ein bis zwei Sätze: Worum geht es? */
  lead: string;
  /** Kontext, der erklärt, warum es jetzt so klingt */
  context: { title: string; text: string };
  /** Höchstens drei Hörhinweise */
  listenFor: string[];
  /** Was ist gegenüber der vorigen Station neu? */
  whatsNew: { title: string; text: string };
  /** Gleichzeitig / Gegenbewegung / Traditionslinie */
  alongside?: { title: string; text: string };
  /** Fachbegriff, nachgestellt */
  term?: { word: string; text: string };
  forces: Forces;
  profile: Profile;
  /** Zeitraffer: Ausschnitt in Sekunden des lokalen Clips, oder false = nicht verwenden */
  rush?: [number, number] | false;
  /** Verweis auf einen Vergleich, der an dieser Station endet */
  compareId?: string;
  /** Verweis auf Grundlagenkarte(n) */
  conceptIds?: string[];
}

export interface Comparison {
  id: string;
  title: string;
  question: string;
  a: { stationId?: string; recordingId: string; label: string; sub: string };
  b: { stationId?: string; recordingId: string; label: string; sub: string };
  /** Höchstens drei kurze Hinweise */
  notice: string[];
  verdict: string;
}

export interface Concept {
  id: string;
  title: string;
  /** Eine Frage, die der Begriff beantwortet */
  question: string;
  text: string;
  term?: string;
  demo: string;
}
