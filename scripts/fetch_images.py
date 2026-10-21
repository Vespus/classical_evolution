#!/usr/bin/env python3
"""
Lädt die Bilder aus src/data/images.json (Wikimedia Commons) als verkleinerte JPEGs nach public/img/.

Aufruf:   python3 scripts/fetch_images.py [--force] [id ...]
Benötigt: ffmpeg, Python >= 3.9

Es werden Vorschaubilder (960 px Breite) vom Thumbnail-Server geladen und auf <= 900 px Breite
als JPEG (Qualität ~82) neu kodiert; Breite und Höhe werden in images.json zurückgeschrieben.
"""
import json
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "src" / "data" / "images.json"
CACHE = ROOT / ".cache" / "img"
UA = "KlangwandelBuild/1.0 (https://github.com/vespus/classical_evolution; educational open-source app)"


def fetch(url: str, dest: Path):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
                f.write(r.read())
            return
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get("Retry-After", "20")) if e.code == 429 else 8 * (attempt + 1)
            print(f"   HTTP {e.code} – warte {wait}s", flush=True)
            time.sleep(min(wait, 600))
        except Exception as e:
            print(f"   Fehler {e!r}", flush=True)
            time.sleep(8 * (attempt + 1))
    raise SystemExit(f"Download fehlgeschlagen: {url}")


def pick_width(orig: int) -> int:
    """Der Thumbnail-Server liefert nur Standardbreiten; eine größere als das Original würde das Original
    (über den großen, oft gedrosselten Medienserver) liefern."""
    for w in (960, 500, 330, 250, 120):
        if w <= orig:
            return w
    return 120


def main():
    args = sys.argv[1:]
    force = "--force" in args
    wanted = [a for a in args if not a.startswith("--")]
    imgs = json.loads(IMAGES.read_text(encoding="utf-8"))
    CACHE.mkdir(parents=True, exist_ok=True)
    for im in imgs:
        if wanted and im["id"] not in wanted:
            continue
        out = ROOT / "public" / im["file"]
        if out.exists() and not force and im.get("width") and "TEST" not in im["creator"]:
            print(f"✓ {im['id']} (vorhanden)")
            continue
        title = urllib.parse.unquote(im["sourceUrl"].split("/wiki/File:")[1])
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(title.replace(" ", "_")) + "?width=" + str(pick_width(im.get("origWidth", 960)))
        print(f"→ {im['id']}  {title}", flush=True)
        raw = CACHE / f"{im['id']}.src"
        fetch(url, raw)
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw), "-vf", "scale='min(900,iw)':-2", "-q:v", "4", str(out)], check=True)
        probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(out)],
                               capture_output=True, text=True, check=True).stdout.strip().split(",")
        im["width"], im["height"] = int(probe[0]), int(probe[1])
        IMAGES.write_text(json.dumps(imgs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"   {out.relative_to(ROOT)} {im['width']}×{im['height']}  {out.stat().st_size // 1024} kB", flush=True)
        time.sleep(1.5)


if __name__ == "__main__":
    main()
