#!/usr/bin/env python3
"""Slice the Safari OT-SVG color-emoji font (NotoColorEmoji.svg.ttf) into
per-block files so Safari lazily downloads only the emoji it renders instead of
the whole ~3.3 MB font.

The partition mirrors the Chromium COLRv1 slices (NotoColorEmoji-400-N.woff2)
declared in src/basis/faces/emoji-faces.css, so both branches stay aligned and
the CSS can reuse one set of ranges. The nanoemoji-built SVG font occasionally
has a standalone glyph the Chromium partition omits (e.g. U+1F46A 👪, composed as
a ZWJ sequence there); those gap codepoints are folded into GAP_SLICE so no emoji
is dropped. emojiRange.test.ts guards completeness — if a future Noto release adds
a gap this script's GAP_SLICE assignment doesn't cover, that test fails.

Run automatically by scripts/emoji/notocolor.sh after the whole font is built;
needs fonttools + lxml (already in nanoemoji's venv).
"""
import os
import re
import subprocess
import sys

# This file lives at scripts/emoji/, so the repo root is three levels up.
ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
CSS = os.path.join(ROOT, "src/basis/faces/emoji-faces.css")
FONT_DIR = os.path.join(ROOT, "static/fonts/NotoColorEmoji")
WHOLE = os.path.join(FONT_DIR, "NotoColorEmoji.svg.ttf")
GAP_SLICE = "8"  # people/family slice — natural home for the standalone 👪 gap

# Emoji blocks (mirror emojiRange.test.ts BLOCKS) + zero-width FORMAT chars.
BLOCKS = [(0x2194,0x21FF),(0x2300,0x23FF),(0x2460,0x24FF),(0x2500,0x25FF),
          (0x2600,0x26FF),(0x2700,0x27BF),(0x2900,0x29FF),(0x2B00,0x2BFF),
          (0x3030,0x3030),(0x303D,0x303D),(0x3297,0x3297),(0x3299,0x3299),
          (0x1F000,0x1FFFF)]
FORMAT = [(0x200D,0x200D),(0x20E3,0x20E3),(0xFE0E,0xFE0F),(0xE0020,0xE007F)]


def in_ranges(cp, ranges):
    return any(a <= cp <= b for a, b in ranges)


def parse_range(s):
    cps = set()
    for tok in s.split(","):
        tok = tok.strip().replace("U+", "").replace("u+", "")
        if not tok:
            continue
        lo, _, hi = tok.partition("-")
        lo = int(lo, 16)
        hi = int(hi, 16) if hi else lo
        cps.update(range(lo, hi + 1))
    return cps


def chromium_ranges():
    """{slice: unicode-range string} from the Chromium (@supports not) branch —
    the UNION of every @font-face that references each NotoColorEmoji-400-N.woff2
    file. More than one face can point at the same file: the keycap face (Noto
    Emoji Keycap) also uses slice 2 and declares the keycap-base codepoints
    (#, *, 0-9) that the color slice-2 face's range trims away. Subsetting the
    SVG slice to only the color face's trimmed range dropped those digit glyphs,
    so Safari's keycap font couldn't shape `digit + U+20E3` and fell back to the
    system emoji. Unioning keeps every glyph any face using the file needs."""
    css = open(CSS).read()
    chrom = css[css.find("@supports not"):]
    out = {}
    for m in re.finditer(
        r"NotoColorEmoji-400-(\d)\.woff2.*?unicode-range:\s*([^;]+);", chrom, re.S
    ):
        n = m.group(1)
        rng = re.sub(r"\s+", " ", m.group(2)).strip()
        out[n] = out[n] + ", " + rng if n in out else rng
    return out


def main():
    from fontTools.ttLib import TTFont

    def zero_timestamps(path):
        # Zero head.created/modified so re-runs are byte-identical: the build-time
        # timestamp nanoemoji/pyftsubset stamp is otherwise the only churn between
        # two otherwise-identical slicings. recalcTimestamp=False stops save()
        # from re-stamping to now.
        f = TTFont(path, recalcTimestamp=False)
        f["head"].created = f["head"].modified = 0
        f.save(path)

    ranges = chromium_ranges()
    whole_cmap = set(TTFont(WHOLE).getBestCmap())
    coverage = {cp for cp in whole_cmap if in_ranges(cp, BLOCKS)}
    union = set()
    for s in ranges.values():
        union |= parse_range(s)
    gap = sorted(
        cp for cp in coverage if cp not in union and not in_ranges(cp, FORMAT)
    )
    if gap:
        print(f"folding {len(gap)} gap codepoint(s) into slice {GAP_SLICE}: "
              + ", ".join("U+%X" % c for c in gap))

    # Normalize the whole font (the slice source + committed canonical) so it and
    # every slice are deterministic across nanoemoji rebuilds.
    zero_timestamps(WHOLE)

    pyft = os.path.join(os.path.dirname(sys.executable), "pyftsubset")
    for n, rng in sorted(ranges.items()):
        unicodes = rng
        if n == GAP_SLICE and gap:
            unicodes += "," + ",".join("U+%X" % c for c in gap)
        out = os.path.join(FONT_DIR, f"NotoColorEmoji.svg-{n}.ttf")
        subprocess.run(
            [pyft, WHOLE, "--unicodes=" + unicodes, "--layout-features=*",
             "--output-file=" + out],
            check=True,
        )
        zero_timestamps(out)
        print(f"slice {n}: {os.path.getsize(out) // 1024} KB")

    # Dedicated keycap face file. Safari binds a given font file to a SINGLE
    # @font-face family, so when 'Noto Emoji Keycap' and 'Noto Color Emoji'
    # slice 2 both point at svg-2.ttf, Safari serves it only as the keycap face
    # (narrow range) and every OTHER slice-2 emoji (e.g. 💬 U+1F4AC) falls back
    # to the system Apple emoji. So the keycap face gets its own file: a subset
    # of the whole font to just the keycap/legacy codepoints, keeping the ccmp
    # keycap ligatures (--layout-features=*), with a distinct internal name so it
    # can never collide with the color slices in Safari's font cache. Only the
    # Safari OT-SVG path has this single-family-per-file limitation; the Chromium
    # (@supports not) keycap face keeps reusing its woff2 slice.
    keycap_unicodes = (
        "U+23,U+2A,U+30-39,U+A9,U+AE,U+203C,U+2049,U+2122,U+2139,U+FE0F,U+20E3"
    )
    keycap_out = os.path.join(FONT_DIR, "NotoColorEmoji.svg-keycap.ttf")
    subprocess.run(
        [pyft, WHOLE, "--unicodes=" + keycap_unicodes,
         "--layout-features=*", "--output-file=" + keycap_out],
        check=True,
    )
    kf = TTFont(keycap_out, recalcTimestamp=False)
    kf["head"].created = kf["head"].modified = 0
    for nid, val in (
        (1, "Noto Emoji Keycap"),
        (4, "Noto Emoji Keycap"),
        (6, "NotoEmojiKeycap-Regular"),
    ):
        kf["name"].setName(val, nid, 3, 1, 0x409)  # Windows
        kf["name"].setName(val, nid, 1, 0, 0)  # Mac
    kf.save(keycap_out)
    print(f"keycap slice: {os.path.getsize(keycap_out) // 1024} KB")


if __name__ == "__main__":
    main()
