#!/usr/bin/env node
// Erzeugt docs/QUELLEN.md aus den Daten (Single Source of Truth: src/data/*.json). Aufruf: npm run credits
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (n) => JSON.parse(readFileSync(join(root, 'src/data', n), 'utf8'));
const works = load('works.json');
const composers = load('composers.json');
const recordings = load('recordings.json');
const images = load('images.json');

const w = (id) => works.find((x) => x.id === id);
const c = (id) => composers.find((x) => x.id === id);
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

let md = `# Quellen und Lizenzen

> Diese Datei wird erzeugt (\`npm run credits\`) – bitte nicht von Hand ändern, sondern \`src/data/recordings.json\` und \`src/data/images.json\`.

Dass eine Komposition gemeinfrei ist, sagt nichts über die Aufnahme. Jede Aufnahme ist deshalb einzeln belegt.

## Aufnahmen

### Im Projekt gespeicherte Ausschnitte (\`public/audio/\`)

Die Ausschnitte wurden aus den Originalen herausgeschnitten, auf gleiche Lautheit gebracht, mit kurzen Ein-/Ausblendungen versehen und als MP3 kodiert (\`scripts/prepare_audio.py\`).

| Werk | Komponist | Interpret | Quelle | Lizenz | Original | Ausschnitt | Namensnennung |
|---|---|---|---|---|---|---|---|
`;
for (const r of recordings.filter((r) => r.provider === 'local')) {
  const wk = w(r.workId);
  md += `| ${esc(wk.title)}${wk.part ? ', ' + esc(wk.part) : ''} | ${esc(c(wk.composerId).name)} | ${esc(r.performer)}${r.recordedYear ? ' (' + r.recordedYear + ')' : ''} | [${esc(r.source)}](${r.sourceUrl}) | [${esc(r.license.name)}](${r.license.url}) | [Datei](${r.local.fileUrl}) | ${r.local.clipStart}–${r.local.clipEnd} s | ${esc(r.attribution)} |\n`;
}

md += `
### Externe Player (nicht im Projekt gespeichert)

Musik, deren Komposition oder Aufnahme nicht frei ist, wird nur über einen eingebetteten Stream des offiziellen Kanals abgespielt (YouTube, datenschutzfreundlicher Modus, erst nach Klick geladen). Titel und Kanal wurden am angegebenen Datum per oEmbed geprüft.

| Werk | Komponist | Interpret | Video | Kanal | Ausschnitt | Geprüft |
|---|---|---|---|---|---|---|
`;
for (const r of recordings.filter((r) => r.provider === 'external')) {
  const wk = w(r.workId);
  md += `| ${esc(wk.title)}${wk.part ? ', ' + esc(wk.part) : ''} | ${esc(c(wk.composerId).name)} | ${esc(r.performer)} | [${esc(r.external.title)}](${r.sourceUrl}) | ${esc(r.external.channel)} | ${r.external.start}–${r.external.end} s | ${r.external.checked} |\n`;
}

md += `
## Bilder

| Bild | Urheber / Datierung | Quelle | Lizenz | Namensnennung |
|---|---|---|---|---|
`;
for (const i of images) {
  md += `| ${esc(i.title)} | ${esc(i.creator)}, ${esc(i.date)} | [${esc(i.source)}](${i.sourceUrl}) | [${esc(i.license.name)}](${i.license.url}) | ${esc(i.attribution)} |\n`;
}

md += `
## Schriften

- **Newsreader** (Production Type) und **Inter** (Rasmus Andersson): SIL Open Font License 1.1, eingebunden über [Fontsource](https://fontsource.org/).

## Software

React, Vite und TypeScript (MIT), Playwright (Apache-2.0) für die Browsertests.
`;

mkdirSync(join(root, 'docs'), { recursive: true });
writeFileSync(join(root, 'docs', 'QUELLEN.md'), md);
console.log('docs/QUELLEN.md geschrieben');
