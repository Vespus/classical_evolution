#!/usr/bin/env node
/* Automatische Barrierefreiheitsprüfung mit axe-core über die wichtigsten Ansichten (npm run build zuvor). */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const axeSrc = readFileSync(join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const stations = JSON.parse(readFileSync(join(root, 'src/data/stations.json'), 'utf8')).sort((a, b) => a.order - b.order);
const comparisons = JSON.parse(readFileSync(join(root, 'src/data/comparisons.json'), 'utf8'));
const PORT = 4174;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 200)); }
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'de-DE' })).newPage();
const routes = ['', '#/reise/' + stations[0].id, '#/reise/' + stations[3].id, '#/reise/' + stations[11].id, '#/reise/' + stations[14].id, '#/reise/' + stations[16].id, '#/vergleich', '#/vergleich/' + comparisons[1].id, '#/landschaft', '#/grundlagen', '#/entdeckungen', '#/quellen'];
let bad = 0;
for (const r of routes) {
  await page.goto(`http://127.0.0.1:${PORT}/${r}`);
  await page.waitForTimeout(1300);
  await page.addScriptTag({ content: axeSrc });
  const res = await page.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] }));
  const v = res.violations.filter((x) => x.impact !== 'minor');
  console.log(`${v.length ? '✗' : '✓'} ${r || '#/'}  ${v.map((x) => `${x.id} (${x.nodes.length})`).join(', ')}`);
  for (const x of v) for (const n of x.nodes.slice(0, 2)) console.log('     ', x.id, n.target.join(' '), '|', (n.failureSummary || '').split('\n')[1] ?? '');
  bad += v.length;
}
await browser.close();
server.kill();
process.exit(bad ? 1 : 0);
