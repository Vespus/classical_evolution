#!/usr/bin/env node
// Prüft die Daten auf Vollständigkeit und Querverweise. Aufruf: npm run verify:data
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (n) => JSON.parse(readFileSync(join(root, 'src/data', n), 'utf8'));

const periods = load('periods.json');
const composers = load('composers.json');
const works = load('works.json');
const recordings = load('recordings.json');
const images = load('images.json');
const stations = load('stations.json');
const comparisons = load('comparisons.json');
const concepts = load('concepts.json');
const landscape = load('landscape.json');
const peaks = load('peaks.json');

const errors = [];
const warn = [];
const err = (m) => errors.push(m);
const ids = (list) => new Set(list.map((x) => x.id));
const has = (set, id, ctx) => set.has(id) || err(`${ctx}: unbekannte ID „${id}“`);

const P = ids(periods), C = ids(composers), W = ids(works), R = ids(recordings), I = ids(images), S = ids(stations), K = ids(concepts);

for (const [name, list] of Object.entries({ periods, composers, works, recordings, images, stations, comparisons, concepts })) {
  const seen = new Set();
  for (const x of list) {
    if (seen.has(x.id)) err(`${name}: doppelte ID ${x.id}`);
    seen.add(x.id);
  }
}

for (const w of works) {
  has(C, w.composerId, `Werk ${w.id}`);
  if (!/^https:\/\//.test(w.fullListenUrl)) err(`Werk ${w.id}: fullListenUrl fehlt`);
}

for (const r of recordings) {
  has(W, r.workId, `Aufnahme ${r.id}`);
  for (const k of ['performer', 'source', 'sourceUrl', 'attribution']) if (!r[k]) err(`Aufnahme ${r.id}: ${k} fehlt`);
  if (!r.license?.name || !r.license?.url) err(`Aufnahme ${r.id}: Lizenz unvollständig`);
  if (r.provider === 'local') {
    const l = r.local;
    if (!l) { err(`Aufnahme ${r.id}: local fehlt`); continue; }
    if (!existsSync(join(root, 'public', l.clip))) err(`Aufnahme ${r.id}: Clip ${l.clip} fehlt (python3 scripts/prepare_audio.py)`);
    if (!peaks[r.id]) err(`Aufnahme ${r.id}: keine Hüllkurve in peaks.json`);
    if (!(l.clipEnd > l.clipStart)) err(`Aufnahme ${r.id}: ungültiger Ausschnitt`);
    if (!l.fileUrl) err(`Aufnahme ${r.id}: fileUrl fehlt`);
  } else if (r.provider === 'external') {
    if (!r.external?.videoId) err(`Aufnahme ${r.id}: external.videoId fehlt`);
    else if (!(r.external.end > r.external.start)) err(`Aufnahme ${r.id}: ungültiger Ausschnitt`);
    if (!r.external?.channel) err(`Aufnahme ${r.id}: Kanal fehlt`);
  } else err(`Aufnahme ${r.id}: unbekannter Provider`);
}

for (const i of images) {
  if (!existsSync(join(root, 'public', i.file))) err(`Bild ${i.id}: Datei ${i.file} fehlt`);
  for (const k of ['alt', 'title', 'creator', 'source', 'sourceUrl', 'attribution']) if (!i[k]) err(`Bild ${i.id}: ${k} fehlt`);
  if (!i.license?.name) err(`Bild ${i.id}: Lizenz fehlt`);
}

stations.forEach((s, n) => {
  has(P, s.periodId, `Station ${s.id}`);
  has(W, s.workId, `Station ${s.id}`);
  has(R, s.recordingId, `Station ${s.id}`);
  if (s.imageId) has(I, s.imageId, `Station ${s.id}`);
  if (s.compareId && !comparisons.some((c) => c.id === s.compareId)) err(`Station ${s.id}: Vergleich ${s.compareId} fehlt`);
  for (const c of s.conceptIds ?? []) has(K, c, `Station ${s.id}`);
  if (s.listenFor.length < 1 || s.listenFor.length > 3) err(`Station ${s.id}: 1–3 Hörhinweise erwartet`);
  if (works.find((w) => w.id === s.workId)?.id !== recordings.find((r) => r.id === s.recordingId)?.workId) err(`Station ${s.id}: Aufnahme gehört nicht zum Werk`);
  if (s.order !== n + 1) warn.push(`Station ${s.id}: order ${s.order} ≠ Position ${n + 1}`);
  for (const k of Object.keys(s.profile)) if (s.profile[k] < 0 || s.profile[k] > 1) err(`Station ${s.id}: Profil ${k} außerhalb 0–1`);
});

for (const c of comparisons) {
  for (const side of [c.a, c.b]) {
    has(R, side.recordingId, `Vergleich ${c.id}`);
    if (side.stationId) has(S, side.stationId, `Vergleich ${c.id}`);
  }
  if (c.notice.length > 3) err(`Vergleich ${c.id}: höchstens drei Hinweise`);
}
for (const l of landscape) has(S, l.stationId, 'Landschaft');

// Audio-Dateien ohne Eintrag?
const audioDir = join(root, 'public/audio');
if (existsSync(audioDir)) {
  const used = new Set(recordings.filter((r) => r.provider === 'local').map((r) => r.local.clip.replace(/^audio\//, '')));
  for (const f of readdirSync(audioDir)) if (!used.has(f)) err(`public/audio/${f} ist in recordings.json nicht dokumentiert`);
}

warn.forEach((w) => console.warn('⚠', w));
if (errors.length) {
  errors.forEach((e) => console.error('✗', e));
  console.error(`\n${errors.length} Fehler.`);
  process.exit(1);
}
console.log(`✓ Daten konsistent: ${stations.length} Stationen, ${recordings.length} Aufnahmen (${recordings.filter((r) => r.provider === 'local').length} lokal), ${images.length} Bilder, ${comparisons.length} Vergleiche, ${concepts.length} Begriffe.`);
