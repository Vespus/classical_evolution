#!/usr/bin/env python3
"""
Erzeugt die kurzen Hörausschnitte (public/audio/*.mp3) und die Hüllkurven (src/data/peaks.json)
aus den in src/data/recordings.json dokumentierten, frei lizenzierten Originalen.

Aufruf:   python3 scripts/prepare_audio.py [--force] [id ...]
Benötigt: ffmpeg, ffprobe (mit libmp3lame), Python >= 3.9, Netzzugang zu upload.wikimedia.org

Ablauf je Aufnahme (provider == "local"):
  1. Original (oder nur der nötige Anfang per HTTP-Range) nach .cache/audio laden
  2. Ausschnitt [clipStart, clipEnd] schneiden, Ein-/Ausblenden, auf gleiche Lautheit bringen (EBU R128, -20 LUFS)
  3. als MP3 (VBR ~130 kbit/s) nach public/audio/<id>.mp3 schreiben
  4. 96 Hüllkurvenwerte für die Zeitleiste im Player berechnen

Wikimedia drosselt Massenabrufe (HTTP 429). Das Skript wartet dann gemäß Retry-After und arbeitet seriell.
"""
import array
import json
import math
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECORDINGS = ROOT / "src" / "data" / "recordings.json"
PEAKS = ROOT / "src" / "data" / "peaks.json"
CACHE = ROOT / ".cache" / "audio"
OUT = ROOT / "public" / "audio"
UA = "KlangwandelBuild/1.0 (https://github.com/vespus/classical_evolution; educational open-source app)"
TARGET_LUFS = -20.0


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, **kw)


def download(url: str, dest: Path, max_bytes: int | None):
    """Lädt url nach dest. Mit max_bytes nur den Anfang (HTTP-Range)."""
    if dest.exists() and dest.stat().st_size > 0:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(8):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        if max_bytes:
            req.add_header("Range", f"bytes=0-{max_bytes - 1}")
        try:
            with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
                while chunk := r.read(1 << 16):
                    f.write(chunk)
            return
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get("Retry-After", "30")) if e.code == 429 else 10 * (attempt + 1)
            print(f"   HTTP {e.code} – warte {wait}s", flush=True)
            if dest.exists():
                dest.unlink()
            time.sleep(min(wait, 900) + 2)
        except Exception as e:  # Netzwerkfehler
            print(f"   Fehler {e!r} – neuer Versuch", flush=True)
            if dest.exists():
                dest.unlink()
            time.sleep(10 * (attempt + 1))
    raise SystemExit(f"Download fehlgeschlagen: {url}")


def measure_loudness(src: Path, start: float, dur: float) -> dict:
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-ss", str(start), "-t", str(dur), "-i", str(src), "-vn",
           "-af", f"loudnorm=I={TARGET_LUFS}:TP=-2:LRA=11:print_format=json", "-f", "null", "-"]
    err = run(cmd).stderr.decode()
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", err, re.S)
    return json.loads(m.group(0)) if m else {}


def cut(src: Path, dest: Path, start: float, end: float, fade_in: float):
    dur = end - start
    st = measure_loudness(src, start, dur)
    ln = (f"loudnorm=I={TARGET_LUFS}:TP=-2:LRA=11:measured_I={st['input_i']}:measured_TP={st['input_tp']}:"
          f"measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:offset={st['target_offset']}:linear=true"
          ) if st else f"loudnorm=I={TARGET_LUFS}:TP=-2"
    fade_out = min(1.6, dur / 4)
    af = f"{ln},afade=t=in:st=0:d={fade_in},afade=t=out:st={dur - fade_out:.2f}:d={fade_out:.2f}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-hide_banner", "-y", "-ss", str(start), "-t", str(dur), "-i", str(src), "-vn", "-ac", "2", "-ar", "44100",
         "-af", af, "-c:a", "libmp3lame", "-q:a", "5", "-map_metadata", "-1", str(dest)])


def peaks_for(path: Path, n: int = 96) -> list[float]:
    raw = run(["ffmpeg", "-hide_banner", "-i", str(path), "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"]).stdout
    samples = array.array("h")
    samples.frombytes(raw[: len(raw) // 2 * 2])
    if not samples:
        return [0.3] * n
    size = max(1, len(samples) // n)
    rms = []
    for i in range(n):
        seg = samples[i * size:(i + 1) * size] or samples[-size:]
        rms.append(math.sqrt(sum(s * s for s in seg) / len(seg)))
    ref = sorted(rms)[int(len(rms) * 0.95) - 1] or 1.0
    return [round(max(0.08, min(1.0, math.sqrt(r / ref))), 2) for r in rms]


def main():
    args = sys.argv[1:]
    force = "--force" in args
    wanted = [a for a in args if not a.startswith("--")]
    recs = json.loads(RECORDINGS.read_text(encoding="utf-8"))
    peaks = json.loads(PEAKS.read_text(encoding="utf-8")) if PEAKS.exists() else {}
    for r in recs:
        if r["provider"] != "local" or (wanted and r["id"] not in wanted):
            continue
        loc = r["local"]
        out = ROOT / "public" / loc["clip"]
        if out.exists() and not force and r["id"] in peaks:
            print(f"✓ {r['id']} (vorhanden)")
            continue
        print(f"→ {r['id']}  {r['performer']}", flush=True)
        ext = Path(loc["fileUrl"].split("?")[0]).suffix or ".bin"
        src = CACHE / f"{r['id']}{ext}"
        download(loc["fileUrl"], src, loc.get("fetchBytes"))
        cut(src, out, loc["clipStart"], loc["clipEnd"], loc.get("fadeIn", 0.25))
        peaks[r["id"]] = peaks_for(out)
        PEAKS.write_text(json.dumps(peaks, indent=0), encoding="utf-8")
        print(f"   {out.relative_to(ROOT)}  {out.stat().st_size / 1e6:.2f} MB", flush=True)
        time.sleep(3)
    PEAKS.write_text(json.dumps(peaks, indent=0), encoding="utf-8")


if __name__ == "__main__":
    main()
