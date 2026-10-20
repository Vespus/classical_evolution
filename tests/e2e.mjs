#!/usr/bin/env node
/*
 * Browser-Test mit Playwright (Chromium).
 * Voraussetzung: `npm run build` ist gelaufen. Das Skript startet `vite preview` selbst.
 *
 *   npm run build && npm run test:e2e
 *
 * Screenshots landen in tests/shots/ (nicht versioniert).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shots = join(root, 'tests', 'shots');
mkdirSync(shots, { recursive: true });

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/`;
const stations = JSON.parse(readFileSync(join(root, 'src/data/stations.json'), 'utf8')).sort((a, b) => a.order - b.order);
const comparisons = JSON.parse(readFileSync(join(root, 'src/data/comparisons.json'), 'utf8'));
const recordings = JSON.parse(readFileSync(join(root, 'src/data/recordings.json'), 'utf8'));

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log('  ✓', msg);
  else {
    failures++;
    console.error('  ✗', msg);
  }
};

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) {
  try {
    const r = await fetch(BASE);
    if (r.ok) break;
  } catch {}
  await sleep(200);
}

// Playwright findet den vorinstallierten Chromium nicht immer über die eigene Revisionsnummer.
const exe = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({
  executablePath: exe,
  args: ['--autoplay-policy=no-user-gesture-required'],
});

const errors = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'de-DE', ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return { ctx, page };
}

try {
  /* ---------- Startseite ---------- */
  console.log('Startseite');
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    ok((await page.locator('h1').innerText()).includes('300 Jahre Musik'), 'Titel sichtbar');
    ok(await page.getByRole('link', { name: /Reise beginnen/ }).first().isVisible(), 'Einstieg „Reise beginnen“');
    await page.waitForTimeout(1600);
    await page.screenshot({ path: join(shots, 'home.png') });
    await page.screenshot({ path: join(shots, 'home-full.png'), fullPage: true });
    ok((await page.locator('.path li').count()) === stations.length, `Routenübersicht zeigt ${stations.length} Stationen`);
    await page.locator('.rush-btn').click();
    await page.waitForSelector('.rush[data-running]', { timeout: 8000 }).catch(() => {});
    ok((await page.locator('.rush[data-running]').count()) === 1, 'Zeitraffer startet erst auf Klick und läuft');
    await page.waitForTimeout(8500);
    const cap = await page.locator('.rush-caption').innerText();
    ok(/\d{4}/.test(cap), `Zeitraffer wandert weiter (${cap})`);
    await page.locator('.rush-btn').click();
    await page.waitForTimeout(400);
    ok((await page.locator('.rush[data-running]').count()) === 0, 'Zeitraffer lässt sich anhalten');
    await ctx.close();
  }

  /* ---------- Reise ---------- */
  console.log('Reise');
  {
    const { ctx, page } = await newPage();
    await page.goto(BASE);
    await page.getByRole('link', { name: /Reise beginnen/ }).first().click();
    await page.waitForURL(`**/#/reise/${stations[0].id}`, { waitUntil: 'commit' });
    ok(true, 'Navigation zur ersten Station');
    ok((await page.locator('.tl-link').count()) === stations.length, 'Zeitleiste enthält alle Stationen');
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(shots, 'station-1.png') });
    await page.screenshot({ path: join(shots, 'station-1-full.png'), fullPage: true });

    await page.keyboard.press('ArrowRight');
    await page.waitForURL(`**/#/reise/${stations[1].id}`, { waitUntil: 'commit' });
    ok(true, 'Pfeiltaste → nächste Station');
    await page.waitForSelector('.st-meta:has-text("Station 02")');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowLeft');
    await page.waitForURL(`**/#/reise/${stations[0].id}`, { waitUntil: 'commit' });
    ok(true, 'Pfeiltaste ← vorige Station');

    // Alle Stationen durchklicken: Überschrift, Player, kein leerer Text
    for (const s of stations) {
      await page.goto(`${BASE}#/reise/${s.id}`);
      await page.waitForSelector('.st-title');
      const title = await page.locator('.st-title').innerText();
      const hasPlayer = (await page.locator('.player').count()) === 1;
      const hints = await page.locator('.listenfor li').count();
      const imgLoc = page.locator('.figure img').first();
      await imgLoc.scrollIntoViewIfNeeded().catch(() => {});
      const img = await imgLoc
        .evaluate((i) => new Promise((res) => (i.complete ? res(i.naturalWidth > 0) : (i.onload = () => res(true), i.onerror = () => res(false)))))
        .catch(() => false);
      ok(title.length > 5 && hasPlayer && hints >= 1 && img, `Station ${s.id}: Titel, Player, ${hints} Hinweise, Bild`);
    }

    // Audio
    await page.goto(`${BASE}#/reise/${stations[0].id}`);
    await page.waitForSelector('.play-btn');
    await page.locator('.play-btn').click();
    await page.waitForSelector('.player.is-playing', { timeout: 8000 }).catch(() => {});
    ok((await page.locator('.player.is-playing').count()) === 1, 'Wiedergabe startet');
    await page.waitForTimeout(1800);
    const t = await page.locator('.player-time span').first().innerText();
    ok(t !== '0:00', `Fortschritt läuft (${t})`);
    await page.screenshot({ path: join(shots, 'station-1-playing.png') });
    await page.locator('.play-btn').click();
    await page.waitForTimeout(400);
    ok((await page.locator('.player.is-playing').count()) === 0, 'Pause funktioniert');

    // Externer Player: erst nach Klick geladen, danach wieder schließbar
    const ext = stations.find((st) => recordings.find((r) => r.id === st.recordingId)?.provider === 'external');
    await page.goto(`${BASE}#/reise/${ext.id}`);
    await page.waitForSelector('.player--external');
    ok((await page.locator('.ext-frame iframe').count()) === 0, 'Externer Player lädt nichts vor dem Klick');
    await page.locator('.player--external .play-btn').click();
    await page.waitForSelector('.ext-frame iframe');
    const src = await page.locator('.ext-frame iframe').getAttribute('src');
    ok(/youtube-nocookie\.com\/embed\/[\w-]+\?start=\d+&end=\d+/.test(src), `Externer Player mit kuratiertem Ausschnitt (${src.slice(30, 80)}…)`);
    await page.locator('.player--external .play-btn').click();
    ok((await page.locator('.ext-frame iframe').count()) === 0, 'Externer Player lässt sich schließen');
    await page.goto(`${BASE}#/reise/${stations[0].id}`);

    // Lesezeichen
    await page.locator('.chip--bookmark').click();
    ok((await page.locator('.chip--bookmark.is-on').count()) === 1, 'Station gemerkt');
    await page.reload();
    ok((await page.locator('.chip--bookmark.is-on').count()) === 1, 'Merkliste übersteht Reload');
    await page.goto(`${BASE}#/entdeckungen`);
    ok((await page.locator('.disc-item').count()) === 1, 'Entdeckungen zeigt gemerktes Werk');
    await page.screenshot({ path: join(shots, 'discoveries.png') });
    await ctx.close();
  }

  /* ---------- Vergleich ---------- */
  console.log('Vergleich');
  {
    const { ctx, page } = await newPage();
    await page.goto(`${BASE}#/vergleich`);
    ok((await page.locator('.cmp-card').count()) === comparisons.length, `${comparisons.length} Vergleiche gelistet`);
    await page.screenshot({ path: join(shots, 'compare-index.png') });
    const local = comparisons.find((c) => [c.a, c.b].every((s) => recordings.find((r) => r.id === s.recordingId)?.provider === 'local'));
    await page.goto(`${BASE}#/vergleich/${local.id}`);
    await page.waitForSelector('.ab-side');
    const buttons = page.locator('.ab-side .play-btn');
    await buttons.nth(0).click();
    await page.waitForSelector('.ab-side.is-active', { timeout: 8000 });
    ok(true, 'A spielt');
    await page.keyboard.press('b');
    await page.waitForTimeout(700);
    const active = await page.locator('.ab-side.is-active').count();
    const playing = await page.locator('.player.is-playing').count();
    ok(active === 1 && playing === 1, 'Taste B wechselt – es klingt immer nur eines');
    await page.screenshot({ path: join(shots, 'compare.png'), fullPage: true });
    await ctx.close();
  }

  /* ---------- Landschaft, Grundlagen, Quellen ---------- */
  console.log('Landschaft / Grundlagen / Quellen');
  {
    const { ctx, page } = await newPage();
    await page.goto(`${BASE}#/landschaft`);
    await page.waitForSelector('.lane');
    ok((await page.locator('.lane').count()) === 5, 'Fünf Regler');
    await page.locator('.land-st').nth(10).hover();
    await page.screenshot({ path: join(shots, 'landscape.png'), fullPage: true });

    await page.goto(`${BASE}#/grundlagen`);
    await page.waitForSelector('.concept');
    ok((await page.locator('.concept').count()) === 10, 'Zehn Begriffe');
    await page.locator('#c-melodie .chip--play').first().click();
    await page.waitForTimeout(500);
    await page.locator('#c-dissonanz .chip--play').first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(shots, 'basics.png'), fullPage: true });

    await page.goto(`${BASE}#/quellen`);
    await page.waitForSelector('.credit-table');
    const rows = await page.locator('.credits section').first().locator('tbody tr').count();
    ok(rows === recordings.length, `Quellenseite listet alle ${recordings.length} Aufnahmen`);
    await page.screenshot({ path: join(shots, 'credits.png'), fullPage: true });

    await page.goto(`${BASE}#/gibt-es-nicht`);
    ok((await page.locator('h1').innerText()).includes('gibt es nicht'), '404-Seite');
    await ctx.close();
  }

  /* ---------- Fehlerfall: Audio nicht ladbar ---------- */
  console.log('Fehlerfall');
  {
    const { ctx, page } = await newPage();
    await page.route('**/audio/*.mp3', (route) => route.abort());
    await page.goto(`${BASE}#/reise/${stations[1].id}`);
    await page.waitForSelector('.play-btn');
    await page.locator('.play-btn').click();
    await page.waitForSelector('.player-error', { timeout: 8000 }).catch(() => {});
    ok((await page.locator('.player-error').count()) === 1, 'Fehlermeldung bei ausgefallenem Audio');
    await page.screenshot({ path: join(shots, 'audio-error.png') });
    await ctx.close();
  }

  /* ---------- Mobil ---------- */
  console.log('Mobil (390×844)');
  {
    const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    for (const [name, hash] of [['home', ''], ['station', `#/reise/${stations[3].id}`], ['compare', `#/vergleich/${comparisons[1].id}`], ['landscape', '#/landschaft'], ['basics', '#/grundlagen'], ['credits', '#/quellen']]) {
      await page.goto(BASE + hash);
      await page.waitForTimeout(1200);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(over <= 1, `${name}: kein horizontales Scrollen der Seite (Überstand ${over}px)`);
      await page.screenshot({ path: join(shots, `m-${name}.png`) });
    }
    await page.goto(`${BASE}#/reise/${stations[3].id}`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(shots, 'm-station-full.png'), fullPage: true });
    await ctx.close();
  }

  ok(errors.length === 0, `keine Konsolen- oder Seitenfehler${errors.length ? ':\n    ' + errors.join('\n    ') : ''}`);
} finally {
  await browser.close();
  server.kill();
}

if (failures) {
  console.error(`\n${failures} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Prüfungen bestanden.');
