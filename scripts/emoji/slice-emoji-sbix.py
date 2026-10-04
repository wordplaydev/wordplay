#!/usr/bin/env python3
"""Slice the iOS sbix color-emoji font into small WOFF2 files, and record what
each one declares in sbix-partition.json for downloadColorEmoji.ts to emit.

iOS 27 Safari loads an OT-SVG font but paints none of its glyphs, so iOS gets
Noto's PNGs as sbix (see cbdt-to-sbix.py). Bitmaps are ~4x the size of the SVG
drawings, so where the SVG slices follow Google's partition (one people slice
is 5.7 MB as sbix), these are cut for what a typical project uses: a handful of
related emoji. Two facts shape the partition:

- WebKit shapes a whole sequence (👍🏽, 👨‍👩‍👧, 🇯🇵) with the font of its first
  character, provided that file holds every part. So each starting character
  "owns" all its sequences, its slice carries their parts and joined glyphs,
  and the CSS declares only owned characters. A part like 🏽 is also owned by
  its own slice, for when it appears alone.
- Owners are packed in Unicode's subgroup order (from static/unicode/codes.txt)
  up to BUDGET, so fruit sit with fruit and faces with faces. 👨, 👩 and 🧑 own
  hundreds of sequences each and can't be split below ~1 MB.

Subsetting keeps only each slice's own joined glyphs (no layout closure, which
would pull every flag into any slice holding the region letters), and every
owned sequence is re-shaped with HarfBuzz against the slice to prove it still
joins to the same glyph as in the whole font.

Usage: slice-emoji-sbix.py <NotoColorEmoji.sbix.ttf> <noto-emoji/2D/svg>
Needs fonttools, brotli, and uharfbuzz.
"""
import json
import os
import re
import subprocess
import sys
from collections import OrderedDict

import uharfbuzz as hb
from fontTools.ttLib import TTFont

# This file lives at scripts/emoji/, so the repo root is two levels up.
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CODES = os.path.join(ROOT, "static/unicode/codes.txt")
FONT_DIR = os.path.join(ROOT, "static/fonts/NotoColorEmoji")
PARTITION = os.path.join(ROOT, "scripts/emoji/sbix-partition.json")
PREFIX = "NotoColorEmoji.sbix"
BUDGET = 100 * 1024

# Emoji blocks (mirror emojiRange.test.ts BLOCKS); Google's private-use glyphs are not emoji.
BLOCKS = [(0x2194, 0x21FF), (0x2300, 0x23FF), (0x2460, 0x24FF), (0x2500, 0x25FF),
          (0x2600, 0x26FF), (0x2700, 0x27BF), (0x2900, 0x29FF), (0x2B00, 0x2BFF),
          (0x3030, 0x3030), (0x303D, 0x303D), (0x3297, 0x3297), (0x3299, 0x3299),
          (0x1F000, 0x1FFFF)]
# Keycap bases and legacy symbols live on the keycap face (see downloadColorEmoji.ts KEYCAP_TRIM).
KEYCAP = {0x23, 0x2A, *range(0x30, 0x3A), 0xA9, 0xAE, 0x203C, 0x2049, 0x2122, 0x2139}
KEYCAP_UNICODES = "U+23,U+2A,U+30-39,U+A9,U+AE,U+203C,U+2049,U+2122,U+2139,U+FE0F,U+20E3"


def in_blocks(cp):
    return any(a <= cp <= b for a, b in BLOCKS)


def shaper(path):
    """Shape text to (glyph ids, each glyph's picture). Pictures, not names, say
    whether two fonts draw the same thing: a subset renumbers unnamed glyphs."""
    font = hb.Font(hb.Face(hb.Blob.from_file_path(path)))
    tt = TTFont(path)
    names = tt.getGlyphOrder()
    strike = next(iter(tt["sbix"].strikes.values()))

    def shape(text):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(font, buf, {})
        ids = [i.codepoint for i in buf.glyph_infos]
        return ids, [strike.glyphs[names[g]].imageData if g else None for g in ids]

    return shape


def sequences(svg_dir):
    """Every emoji sequence, with its (group, subgroup) where codes.txt names one.
    codes.txt omits sequences with a text-default part (🏃‍♀, 👨‍⚕), and Noto's SVG
    filenames omit country and tag flags, so it takes both."""
    found = {}
    for line in open(CODES, encoding="utf-8"):
        fields = line.rstrip("\n").split(";")
        if len(fields) >= 5 and fields[3] and fields[4] != "kc":
            found[tuple(int(h, 16) for h in fields[0].split())] = (fields[3], fields[4])
    for name in os.listdir(svg_dir):
        match = re.fullmatch(r"emoji_u([0-9a-f_]+)\.svg", name)
        if match:
            found.setdefault(tuple(int(h, 16) for h in match.group(1).split("_")), None)
    return found


def owners_of(whole, svg_dir):
    """Each starting character → (its codepoints, its glyph ids, its sequences), by subgroup."""
    font = TTFont(whole)
    cmap = font.getBestCmap()
    order = font.getGlyphOrder()
    shape = shaper(whole)
    owners, subgroups = {}, {}
    for cps, subgroup in sequences(svg_dir).items():
        if cps[0] in KEYCAP or not in_blocks(cps[0]) or not all(c in cmap or c == 0xFE0F for c in cps):
            continue
        text = "".join(map(chr, cps))
        # An owner sorts by its own subgroup, or else the first of its sequences'.
        if subgroup is not None and (len(cps) == 1 or cps[0] not in subgroups):
            subgroups[cps[0]] = subgroup
        parts, gids, texts = owners.setdefault(cps[0], (set(), set(), []))
        parts.update(cps)
        # Each part's own glyph too: a subset drops the cmap entry of a glyph it isn't given.
        gids.update(shape(text)[0], (order.index(cmap[c]) for c in cps if c in cmap))
        texts.append(text)
    # Region letters that pair as no country, and a tag flag with no tags, draw
    # Noto's unknown-flag glyph, so a letter's slice owns all its pairs.
    letters = range(0x1F1E6, 0x1F200)
    extra = [(a, b) for a in letters for b in letters] + [(0x1F3F4, 0xE007F)]
    for cps in extra:
        if cps[0] in owners and all(c in cmap for c in cps):
            text = "".join(map(chr, cps))
            parts, gids, texts = owners[cps[0]]
            if text not in texts:
                parts.update(cps)
                gids.update(shape(text)[0])
                texts.append(text)
    # Glyphs the font draws that start no listed sequence.
    for cp in sorted(cmap):
        if cp not in owners and in_blocks(cp) and cp not in KEYCAP:
            owners[cp] = ({cp}, set(shape(chr(cp))[0]), [chr(cp)])
    # Group related emoji, keeping codepoint order within each subgroup.
    keys = sorted(owners, key=lambda cp: (subgroups.get(cp, ("~", "~")), cp))
    return OrderedDict((cp, owners[cp]) for cp in keys)


def pack(whole, owners):
    """Group owners in order, closing a slice before it would pass BUDGET."""
    font = TTFont(whole)
    order = font.getGlyphOrder()
    strike = next(iter(font["sbix"].strikes.values()))
    png = {order.index(name): len(g.imageData or b"") for name, g in strike.glyphs.items()}
    slices, current, size = [], [], 0
    for cp, (_, gids, _) in owners.items():
        cost = sum(png.get(g, 0) for g in gids)
        if current and size + cost > BUDGET:
            slices.append(current)
            current, size = [], 0
        current.append(cp)
        size += cost
    if current:
        slices.append(current)
    return slices


def subset(whole, out, unicodes, gids=None, names=()):
    """Subset to TrueType at `out`; to_woff2 compresses it once it's verified."""
    pyft = os.path.join(os.path.dirname(sys.executable), "pyftsubset")
    args = [pyft, whole, "--unicodes=" + unicodes, "--layout-features=*", "--output-file=" + out]
    if gids is not None:
        args += ["--gids=" + ",".join(map(str, sorted(gids))), "--no-layout-closure"]
    subprocess.run(args, check=True, capture_output=True)
    if names:
        f = TTFont(out, recalcTimestamp=False)
        for nid, val in names:
            f["name"].setName(val, nid, 3, 1, 0x409)
            f["name"].setName(val, nid, 1, 0, 0)
        f.save(out)


def to_woff2(ttf):
    """Compress a verified subset, with zeroed timestamps so re-runs are byte-identical."""
    f = TTFont(ttf, recalcTimestamp=False)
    f["head"].created = f["head"].modified = 0
    f.flavor = "woff2"
    out = ttf[: -len(".ttf")] + ".woff2"
    f.save(out)
    os.remove(ttf)
    return out


def variations(path):
    """Base codepoint → glyph for each `base + FE0F` the cmap names (None when it defers to the default glyph)."""
    tables = [t for t in TTFont(path)["cmap"].tables if t.format == 14]
    return dict(tables[0].uvsDict.get(0xFE0F, [])) if tables else {}


def to_range(cps):
    """Codepoints as a CSS unicode-range, runs collapsed, lowercase like the rest of the file."""
    cps = sorted(cps)
    runs, start = [], cps[0]
    for prev, cp in zip(cps, cps[1:] + [None]):
        if cp != prev + 1:
            runs.append(f"U+{start:x}" if start == prev else f"U+{start:x}-{prev:x}")
            start = cp
    return ", ".join(runs)


def main(whole, svg_dir):
    owners = owners_of(whole, svg_dir)
    # Every picture in the font should be some owned sequence's, or no slice draws it.
    # Keycaps live on the keycap face, and Google's private-use glyphs aren't emoji.
    font = TTFont(whole)
    names = font.getGlyphOrder()
    strike = next(iter(font["sbix"].strikes.values()))
    shape = shaper(whole)
    reached = set().union(*(o[1] for o in owners.values()))
    for cp in KEYCAP:
        reached.update(shape(chr(cp))[0], shape(chr(cp) + "\ufe0f\u20e3")[0], shape(chr(cp) + "\u20e3")[0])
    reached.add(names.index(font.getBestCmap()[0x20E3]))
    for cp, glyph in font.getBestCmap().items():
        if 0xE000 <= cp <= 0xF8FF or cp >= 0xF0000:
            reached.add(names.index(glyph))
            reached.update(shape(chr(cp))[0])
    unreached = [n for i, n in enumerate(names) if strike.glyphs[n].imageData and i not in reached]
    if unreached:
        sys.exit(f"{len(unreached)} drawn glyph(s) no sequence reaches, so no slice would draw them: {unreached[:10]}")
    slices = pack(whole, owners)
    for name in os.listdir(FONT_DIR):
        if re.fullmatch(re.escape(PREFIX) + r"-[\w]+\.(ttf|woff2)", name):
            os.remove(os.path.join(FONT_DIR, name))

    whole_shape = shaper(whole)
    whole_variations = variations(whole)
    partition, failures = [], 0
    for i, cps in enumerate(slices):
        out = os.path.join(FONT_DIR, f"{PREFIX}-{i}.ttf")
        # FE0F keeps the cmap's variation sequences (♀ + FE0F), without which
        # CoreText hands those to Apple's emoji even when this file draws them.
        parts = set().union(*(owners[c][0] for c in cps)) | {0xFE0F}
        gids = set().union(*(owners[c][1] for c in cps))
        subset(whole, out, ",".join(f"U+{c:X}" for c in sorted(parts)), gids)
        # HarfBuzz reads TrueType, not WOFF2, so verify before compressing.
        shape = shaper(out)
        for c in cps:
            for text in owners[c][2]:
                if shape(text)[1] != whole_shape(text)[1]:
                    failures += 1
                    print(f"slice {i}: {text!r} shapes differently than in the whole font")
        sliced = variations(out)
        for base, glyph in whole_variations.items():
            if base in parts and sliced.get(base) != glyph:
                failures += 1
                print(f"slice {i}: U+{base:X} + FE0F lost its variation sequence")
        out = to_woff2(out)
        partition.append(to_range(cps))
        print(f"{PREFIX} slice {i}: {os.path.getsize(out) // 1024} KB")
    if failures:
        sys.exit(f"{failures} sequence(s) no longer join in their slice.")

    # The keycap face's own file, as for the SVG font (see slice-emoji-svg.py).
    keycap = os.path.join(FONT_DIR, f"{PREFIX}-keycap.ttf")
    subset(
        whole,
        keycap,
        KEYCAP_UNICODES,
        names=((1, "Noto Emoji Keycap"), (4, "Noto Emoji Keycap"), (6, "NotoEmojiKeycap-Regular")),
    )
    to_woff2(keycap)
    with open(PARTITION, "w") as f:
        json.dump(partition, f, indent=1)
        f.write("\n")
    print(f"{len(slices)} slices; ranges written to {os.path.relpath(PARTITION, ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
