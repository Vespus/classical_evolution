#!/usr/bin/env node
// Erzeugt docs/MUSIKLISTE.txt: alle eingebundenen Aufnahmen, mit YouTube-Links, Zeitmarken und Dateinamen
// für eigene Medien (Ordner media/). Quelle der Wahrheit: src/data/*.json. Aufruf: npm run musiklist
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (n) => JSON.parse(readFileSync(join(root, 'src/data', n), 'utf8'));
const works = load('works.json');
const composers = load('composers.json');
const recordings = load('recordings.json');
const stations = load('stations.json');

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const lines = [];
const p = (s = '') => lines.push(s);

p('KLANGWANDEL – MUSIKLISTE');
p('========================');
p('Diese Datei wird erzeugt (npm run musiklist). Nicht von Hand ändern, sondern src/data/recordings.json.');
p();
p('So tauschen Sie eine Aufnahme gegen eine eigene Datei:');
p('  Legen Sie in den Ordner media/ (im Projekt: public/media/, auf dem Server: .../klassik/media/) eine Datei,');
p('  die so heißt wie die Kennung unten, z. B. rec-beethoven.mp4 oder rec-beethoven.mp3.');
p('  Möglich: mp4, webm (Video) sowie mp3, m4a, ogg, opus (Ton). Die Datei wird von Anfang bis Ende gespielt,');
p('  schneiden Sie also den gewünschten Ausschnitt vorher zu. Ohne Datei bleibt alles wie bisher.');
p('  Beim Ausliefern per rsync: --exclude \'media/\' angeben, damit der Ordner nicht gelöscht wird.');
p();
p('Hinweis zu den Zeitmarken: Titel, Kanal und Länge der Videos wurden technisch geprüft, das Hören der Ausschnitte');
p('konnte dabei nicht erfolgen. Wo eine Startmarke nur geschätzt ist, steht „STARTMARKE GESCHÄTZT“ – bitte einmal anhören.');
p();

const ordered = [...stations].sort((a, b) => a.order - b.order);
ordered.forEach((s, i) => {
  const r = recordings.find((x) => x.id === s.recordingId);
  const w = works.find((x) => x.id === s.workId);
  const c = composers.find((x) => x.id === w.composerId);
  p('-'.repeat(78));
  p(`${String(i + 1).padStart(2, '0')}. ${c.name}: ${w.title}${w.part ? ', ' + w.part : ''} (${w.year})`);
  p(`    Kennung / Dateiname: ${r.id}.mp4 | .mp3 …`);
  p(`    Interpreten:         ${r.performer}${r.recordedYear ? ' (' + r.recordedYear + ')' : ''}`);
  if (r.provider === 'external') {
    const e = r.external;
    p('    Art:                 Video (YouTube, Einbettung erst nach Klick)');
    p(`    Video:               https://www.youtube.com/watch?v=${e.videoId}`);
    p(`    Ausschnitt:          ${mmss(e.start)} – ${mmss(e.end)}  (Link mit Startmarke: https://www.youtube.com/watch?v=${e.videoId}&t=${e.start}s)`);
    p(`    Titel laut YouTube:  ${e.title}`);
    p(`    Kanal:               ${e.channel}`);
    if (e.estimatedStart) p('    STARTMARKE GESCHÄTZT: Anfang des 2. Satzes nur aus der Länge der Sinfonie abgeleitet; bitte prüfen und in recordings.json anpassen.');
  } else {
    const l = r.local;
    p(`    Art:                 gespeicherter Ausschnitt (${l.clip}), ${mmss(l.clipEnd - l.clipStart)} Minuten`);
    p(`    Original:            ${l.fileUrl}`);
    p(`    Quelle:              ${r.source}`);
    p(`    Lizenz:              ${r.license.name} (${r.license.url})`);
  }
  p(`    Ganze Aufnahme:      ${w.fullListenUrl}`);
  if (s.deeper) {
    p(`    Tiefer gehen:        ${s.deeper.title}`);
    s.deeper.links.forEach((l) => p(`                         ${l.label}: ${l.url}`));
  }
});
p('-'.repeat(78));
p();
p(`Insgesamt ${recordings.length} Aufnahmen: ${recordings.filter((r) => r.provider === 'local').length} gespeichert, ${recordings.filter((r) => r.provider === 'external').length} als YouTube-Video.`);
writeFileSync(join(root, 'docs/MUSIKLISTE.txt'), lines.join('\n') + '\n');
console.log('docs/MUSIKLISTE.txt geschrieben');
