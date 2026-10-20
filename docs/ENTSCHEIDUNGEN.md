# Entscheidungen

Kurz begründet, in der Reihenfolge, in der sie anfielen.

**Stack.** Vite + React + TypeScript, ohne Router-, Animations- oder UI-Bibliothek. Hash-Routing, damit der Build ohne Serverkonfiguration (und per `file://`-nahem Hosting) läuft. Schriften lokal über Fontsource (Newsreader für Text, Inter für Oberfläche) – keine Verbindung zu Fremdservern beim bloßen Besuch.

**Inhalte als Daten.** Alles Redaktionelle liegt in `src/data/*.json` und wird beim Start per `scripts/verify-data.mjs` auf Querverweise, Lizenzfelder und vorhandene Dateien geprüft.

**Neunzehn Stationen, gleichmäßig verteilt.** Die Liste folgt dem Vorschlag aus dem Auftrag, mit Änderungen: Gluck entfällt (keine saubere Aufnahme; sein Anliegen – Schlichtheit – steckt in Haydn), Liszt wird bei Chopin erwähnt, Schostakowitsch bei Bartók. Neu sind Bartók als „dritter Weg“, Pärt als Gegenbewegung und Caroline Shaw als Schluss, der zu Bach zurückführt. Die Zeitleiste ist **nicht maßstäblich**; die Landschaft sagt das ausdrücklich.

**Keine Fortschrittserzählung.** Jede Station hat einen Kasten „Gleichzeitig“ (Parallelwege, Gegenbewegungen, Legenden), die Landschaft zeigt Rückwege (Brahms, Chopin, Reich), und der Schluss lautet: Die Tonart ist nicht verschwunden, sie ist eine Möglichkeit geworden. Legenden werden benannt statt weitererzählt (Schicksalsmotiv bei Beethoven, Tumult bei Strawinsky).

**Farbwelt je Station.** Jede Station setzt über `data-theme` eigene Farben; der Übergang (Hintergrund, Akzent) ist bewusst langsam. So wird der Weg von Sand über Nachtgrün und Weinrot zu Schwarz und Rot sichtbar – und weiß, dann ruhig zurück.

**Klangprofil statt Zahlen.** Fünf qualitative Regler (Tonart, Klangapparat, Puls, Reibung, Gestalt) mit Polbeschriftung, ohne Zahlenwerte im Interface; der blasse Punkt zeigt die Vorgängerstation. Die Werte sind redaktionelle Einschätzungen und als solche gekennzeichnet.

**Hörausschnitte vorab geschnitten.** Kleine MP3-Dateien statt Zeitmarken in großen Originalen: schnell, offlinefähig, mit eingebauten Blenden, auf gleiche Lautheit gebracht. „Ganzer Satz“ streamt wo sinnvoll das Original (nur Ogg/MP3, keine großen FLAC-Dateien); sonst führt ein Link zur Quelle.

**Rechte.** Lokal nur, was ausdrücklich frei lizenziert oder in den USA und Europa gemeinfrei ist. Alles andere (neuere Aufnahmen, Werke von Urhebern, die weniger als siebzig Jahre tot sind) nur als externer Player: offizielle Kanäle, `youtube-nocookie`, erst nach Klick. Dabei werden Start und Ende der Passage per URL-Parameter kuratiert. Das Format ist austauschbar (`Recording.external.kind`).

**Eine Quelle zur Zeit.** `claimAudio()` verbindet Aufnahme-Player, Synthesizer-Demos und externen Player; jeder stoppt die anderen. Vor dem Wechsel blendet der Player kurz aus.

**A/B-Vergleich.** Beide Ausschnitte werden vorgeladen, die Tasten `A`/`B` springen sofort. Ein Stück beginnt immer am kuratierten Anfang – beim Vergleich zweier verschiedener Werke wäre „gleiche Position“ sinnlos.

**Mini-Demos synthetisch.** Die zehn Begriffe werden live mit Web Audio erzeugt (ehrlich als synthetisch gekennzeichnet), damit sie ohne Lizenzfragen und ohne Download funktionieren.

**Zeitraffer.** Auf der Startseite: je sieben Sekunden aller lokal gespeicherten Stationen hintereinander (Bach, Mozart, Berlioz, Chopin, Mahler, Schönberg). Videos nehmen nicht teil; deshalb sind es nur sechs Ausschnitte.

**Quellenwechsel unterwegs.** Der Medienserver von Wikimedia drosselte die Abrufe während der Entwicklung dauerhaft (HTTP 429). Mehrere Aufnahmen kommen deshalb aus anderen, ebenso gut dokumentierten Quellen: Internet Archive (Mozart: Columbia University Orchestra; Mahler: Peabody Symphony Orchestra; Chopin: Musopen-Sammlung unter CC0), ibiblio (Bach). Haydn, Beethoven, Wagner, Schubert und Debussy liefen zeitweise als gemeinfreie Schallplatten und sind inzwischen Videos (siehe unten). Das hat inhaltliche Folgen: Haydn steht mit der Sinfonie Nr. 94 (Paukenschlag-Satz) statt mit dem Quartett ‚Lerche‘ da, Brahms mit der Tragischen Ouvertüre statt mit der 4. Sinfonie. Beides funktioniert didaktisch mindestens so gut. Haydn steht nach Mozart, weil seine Sinfonie (1791) jünger ist als Mozarts g-Moll-Sinfonie (1788).

**Videos statt Schellack.** Die fünf alten Schallplatten (Beethoven 1927, Wagner 1927, Haydn 1929, Debussy 1930, Schubert 1915) sind durch offizielle YouTube-Aufnahmen ersetzt: Rauschen und eingeengter Klang machen den Einstieg für Menschen ohne Klassik-Erfahrung unnötig schwer, und das Bild vom Orchester hilft beim Zuhören. Preis: Diese Beispiele laufen nur online und erst nach Klick. Der A/B-Wechsel ist dort etwas langsamer. Die Videos sind per oEmbed geprüft (Datum in den Daten).

**Einfache Sprache.** Alle Texte sind für Leserinnen und Leser ohne humanistische Bildung geschrieben: kurze Sätze, Alltagswörter, Fachwörter erst nach dem Hören und mit Erklärung. „Tonart“ heißt im Text „Zuhause“ (der Ton, bei dem ein Stück ankommt). Die Klangprofil-Regler tragen Alltagsnamen (Zuhause, Größe, Schlag, Schärfe, Melodie oder Klang). Die Startseite erklärt kurz, was „klassisch“ hier meint: aufgeschriebene Musik, die über Jahrhunderte gespielt wird – nicht bloß „schon lange da“. Die Sie-Anrede bleibt.

**Barrierefreiheit geprüft.** Kontraste je Farbwelt wurden gerechnet und angepasst (mindestens 4,5:1 für Text), `npm run test:a11y` prüft die wichtigsten Ansichten mit axe-core.

**Brahms vorläufig extern.** Die freie hr-Aufnahme der Tragischen Ouvertüre (Wikimedia Commons, CC BY-SA 4.0) ließ sich wegen der Drosselung nicht laden. Bis dahin spielt die Station den offiziellen Concertgebouworkest-Stream. Umstellung auf lokal: Datei `Johannes_Brahms_Tragische_Ouvertüre_excerpt.mp3` nach `.cache/audio/rec-brahms.mp3` legen, den Eintrag `rec-brahms` in `src/data/recordings.json` auf `provider: "local"` mit `local: { fileUrl, clip: "audio/rec-brahms.mp3", clipStart: 0, clipEnd: 75 }` und Lizenz CC BY-SA 4.0 (hr-Sinfonieorchester, Ltg. Dean Dixon, 1968) umstellen, `python3 scripts/prepare_audio.py rec-brahms`, `npm run verify:data`.
