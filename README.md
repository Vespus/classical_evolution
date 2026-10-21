# Klangwandel – Eine Zeitreise zum Hören

300 Jahre abendländische Musik in neunzehn Stationen, vom Barock bis zur Gegenwart. Kein Musiklexikon, sondern eine Reise, auf der man **hört**, wie sich Klang, Harmonik, Besetzung und Rhythmus verändern – mit echten Aufnahmen, einem direkten A/B-Vergleich („Hör den Unterschied“), einer Landschaft der fünf Regler und einer optionalen Ebene „Was höre ich da eigentlich?“.

Zielgruppe: Erwachsene ohne Vorkenntnisse und ohne klassische Bildung. Die Texte sind in einfacher Sprache gehalten: kurze Sätze, Alltagswörter, jedes Fachwort wird erklärt, und zwar erst nach dem Hören. Eine Vorstellung von „klassisch“ wird nicht vorausgesetzt (die Startseite klärt sie kurz). Als wiederkehrender Anker dient die Frage **„Und Taylor Swift?“**: Auf jeder Station sagt eine Karte, was davon in Popmusik steckt und was nicht (siehe `docs/ENTSCHEIDUNGEN.md`).

## Schnellstart

Voraussetzung: Node.js ≥ 20 (getestet mit 22).

```bash
npm install          # Abhängigkeiten
npm run dev          # Entwicklungsserver, http://localhost:5173
npm run build        # Typprüfung + Produktions-Build nach dist/
npm run preview      # gebauten Stand ansehen, http://localhost:4173
```

Der Build ist rein statisch (`base: './'`, Hash-Routing) und läuft aus jedem Verzeichnis eines beliebigen Webservers.

| Befehl | Zweck |
|---|---|
| `npm run verify:data` | Prüft Querverweise, Lizenzangaben, vorhandene Audio-/Bilddateien |
| `npm run credits` | Erzeugt `docs/QUELLEN.md` aus den Daten |
| `npm run prepare:audio` | Schneidet die Hörausschnitte aus den Originalen (siehe unten) |
| `npm run test:e2e` | Browsertests mit Playwright, mit Screenshots in `tests/shots/` (zuvor `npm run build`) |
| `npm run test:a11y` | Automatische Barrierefreiheitsprüfung mit axe-core über alle Hauptansichten |
| `python3 scripts/fetch_images.py` | Lädt die Bilder aus `images.json` von Wikimedia Commons (verkleinert) |

## Aufbau

```
src/
  data/          Alle Inhalte als JSON – nichts davon steckt in der Oberfläche
    periods, composers, works, recordings, images,
    stations, comparisons, concepts, landscape, peaks
  lib/           audio.ts (Engine), synth.ts (Mini-Demos), router, storage, types
  components/    Player, Waveform, Timeline, Klangprofil, Demos …
  views/         Home, Journey, Compare, Landscape, Basics, Discoveries, Credits
  styles/        tokens.css (Farbwelten), base.css, components.css, views.css
public/audio/    Hörausschnitte (MP3)
public/img/      Bilder (verkleinert)
scripts/         prepare_audio.py, verify-data.mjs, make-credits.mjs
tests/e2e.mjs    Playwright-Test mit Screenshots
docs/            QUELLEN.md (erzeugt), ENTSCHEIDUNGEN.md
```

Neue Station: Einträge in `works.json`, `recordings.json`, `stations.json` (und bei Bedarf `images.json`) ergänzen, `python3 scripts/prepare_audio.py`, dann `npm run verify:data`.

## Audio

* **Lokale Ausschnitte** (`provider: "local"`, sieben Stationen): frei lizenzierte Aufnahmen aus Internet Archive, ibiblio/Pandora Music und Wikimedia Commons (Open Audio License, CC0, CC BY, CC BY-SA, Public-Domain-Widmungen). `scripts/prepare_audio.py` lädt das Original (bei großen Dateien nur den nötigen Anfang), schneidet den kuratierten Abschnitt, gleicht die Lautheit an (−20 LUFS, damit A/B fair bleibt), blendet ein und aus und berechnet die Hüllkurve für den Player. Benötigt `ffmpeg` mit `libmp3lame`. Liegt ein Original bereits als `.cache/audio/<id>.<endung>` vor, wird es nicht erneut geladen (nützlich bei gedrosselten Servern).
* **Videos** (`provider: "external"`, zwölf Stationen): Alle Aufnahmen, die nicht frei lizenziert sind – bewusst auch Haydn, Beethoven, Schubert, Wagner und Debussy statt alter Schellackplatten, weil gute Aufnahmen und das Bild vom Orchester das Verstehen unterstützen – werden nur über den offiziellen Kanal des Orchesters/Ensembles eingebunden – `youtube-nocookie.com`, **erst nach Klick** geladen, mit kuratiertem Start und Ende. Titel und Kanal jedes Videos wurden per oEmbed geprüft (Datum in den Daten).
* **Regeln der Engine:** nichts startet von selbst; es klingt immer nur eine Quelle (Aufnahme, Synth-Demo oder externer Player schließen einander aus); A/B-Wechsel sind sofort, weil beide Ausschnitte vorgeladen sind.
* **Ausfallsicherheit:** Schlägt das Laden fehl, zeigt der Player eine Meldung mit Link zur Quelle; die Seite läuft weiter.

Wikimedia drosselt Massenabrufe (HTTP 429). Die Skripte warten dann gemäß `Retry-After`; Originale und Rohbilder landen in `.cache/` (nicht versioniert).

## Quellen und Rechte

Siehe die Seite „Quellen & Lizenzen“ in der App und [`docs/QUELLEN.md`](docs/QUELLEN.md). Wichtig:

* Gemeinfreiheit der Komposition ≠ freie Aufnahme. Jede Aufnahme ist einzeln belegt.
* Lokal gespeichert wird nur, was ausdrücklich frei lizenziert oder gemeinfrei ist; alles andere läuft über den offiziellen Videokanal.
* Für eine öffentliche Veröffentlichung gilt: Die Einbettung offizieller Streams ersetzt keine Lizenz. Vor dem Live-Gang bitte prüfen, ob Ihre Nutzung der Ausschnitte der CC-BY-SA-Lizenzen (Namensnennung, gleiche Lizenz für Bearbeitungen) und Ihr Hosting den Anforderungen entspricht.

## Bedienung

| Taste | Wirkung |
|---|---|
| `←` `→` | vorige / nächste Station |
| `Leertaste` | Hörbeispiel starten / anhalten |
| `A` `B` (oder `1` `2`) | im Vergleich sofort zum jeweiligen Stück wechseln |
| `←` `→` in der Landschaft | durch die Zeit fahren |

Merkliste („Deine Entdeckungen“) und besuchte Stationen liegen ausschließlich im `localStorage` des Browsers. Kein Konto, kein Tracking.

## Barrierefreiheit

Semantische Landmarken, „Zum Inhalt springen“, sichtbarer Fokus, vollständige Tastaturbedienung (auch der Zeitschieber im Player), Textalternativen für Diagramme, Statusmeldungen per `aria-live`, `prefers-reduced-motion` wird respektiert, Kontraste je Farbwelt geprüft.

## Entscheidungen

Kurzes Protokoll der Designentscheidungen: [`docs/ENTSCHEIDUNGEN.md`](docs/ENTSCHEIDUNGEN.md).
