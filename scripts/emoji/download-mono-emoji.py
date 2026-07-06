#!/usr/bin/env python3
"""Refresh the monochrome Noto Emoji face
(static/fonts/NotoEmoji/NotoEmoji-400.woff2).

Downloads the current Regular (400) static Noto Emoji outline font from Google
Fonts and re-encodes it as woff2 — the whole-file mono emoji face declared in
emoji-faces.css. `downloadColorEmoji.ts` re-derives its unicode-range from the
new cmap and `npm run fonts-fix` rehashes it, so refreshing the file is all
that's needed to pick up new glyphs (e.g. a new Unicode release).

Source: Google Fonts' download manifest, which serves the current published
version (3.005 = Emoji 17 at time of writing) — NEWER than the google/fonts
GitHub `main` mirror, which lags. Unlike the color font (which needs the
nanoemoji OT-SVG build for Safari), the mono font is a normal font: download +
woff2, no custom build.

Run via `npm run emoji-update` (fonts half); needs fonttools + brotli, which the
scripts/emoji/download-mono-emoji.sh wrapper installs into a throwaway venv.
"""
import json
import os
import tempfile
import urllib.request

from fontTools.ttLib import TTFont

# This file lives at scripts/emoji/, so the repo root is three levels up.
ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
OUT = os.path.join(ROOT, "static/fonts/NotoEmoji/NotoEmoji-400.woff2")
MANIFEST_URL = "https://fonts.google.com/download/list?family=Noto%20Emoji"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


def fetch(url: str) -> bytes:
    return urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": UA})
    ).read()


# The download manifest lists the published static instances; take Regular (400).
manifest = json.loads(fetch(MANIFEST_URL).decode("utf8").lstrip(")]}'\n "))
ref = next(
    r
    for r in manifest["manifest"]["fileRefs"]
    if r["filename"].endswith("/NotoEmoji-Regular.ttf")
)

fd, tmp = tempfile.mkstemp(suffix=".ttf")
os.close(fd)
try:
    with open(tmp, "wb") as f:
        f.write(fetch(ref["url"]))
    # recalcTimestamp=False + fixed timestamps → byte-identical re-runs (no churn).
    font = TTFont(tmp, recalcTimestamp=False)
    font["head"].created = font["head"].modified = 0

    # Drop the cmap format-14 (Unicode Variation Sequences) subtable. Google's
    # Noto Emoji ships one, but any format-14 table (its stock 371-entry one, or
    # a rebuilt full-coverage one) mis-selects in Safari's CoreText: a font with
    # a UVS table is treated as supporting ONLY the sequences it lists, and Safari
    # then sends monochrome-requested emoji (withMonoEmoji → base+FE0E) to the
    # system color emoji instead of this font. Removing it lets Safari's DEFAULT
    # handling apply — FE0E skips the color faces and lands on this mono font. The
    # app pairs this with presentation-specific font cascades (the mono font is
    # kept OUT of the code font, so editor emoji are unambiguously color) rather
    # than relying on variation-selector resolution within a mixed cascade.
    cmap = font["cmap"]
    cmap.tables = [t for t in cmap.tables if t.format != 14]
    font.flavor = "woff2"
    font.save(OUT)
    version = font["name"].getDebugName(5)
    print(
        f"Wrote {OUT} ({os.path.getsize(OUT) // 1024} KB, "
        f"{len(font.getBestCmap())} glyphs, {version})"
    )
finally:
    os.remove(tmp)
