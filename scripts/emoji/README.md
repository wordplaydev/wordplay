# Updating emoji

Emoji in Wordplay come from **four upstream-fed subsystems**. This is the one
place that documents them and the order they run in. In almost all cases you just
run one command:

```bash
npm run emoji-update            # names + fonts, end to end
npm run emoji-update -- --check # is an update even due? (reports, changes nothing)
```

## What "emoji" is made of

| #   | Subsystem                          | Produces                                                                          | Fed by                                                                              |
| --- | ---------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A   | Emoji **codepoints** (which exist) | `static/unicode/codes.txt` + `glyph-names.txt`                                    | unicode.org (`npm run codes`)                                                       |
| B   | Per-locale emoji **names**         | `static/locales/*/{locale}-emojis.json`                                           | Unicode CLDR (`npm run locales-emojis`)                                             |
| C   | **Mono** emoji font                | `NotoEmoji-400.woff2` (Regular static)                                            | Google Fonts download endpoint (`download-mono-emoji.py`)                           |
| D   | **Chromium** color font (COLRv1)   | `NotoColorEmoji-400-N.woff2` slices + their `unicode-range`s in `emoji-faces.css` | Google Fonts css2 (`downloadColorEmoji.ts`)                                         |
| E   | **Safari** color font (OT-SVG)     | `NotoColorEmoji.svg-N.woff2` slices (ranges derived from D's CSS)                 | nanoemoji + `slice-emoji-svg.py` (`notocolor.sh`)                                   |
| E′  | **iOS** color font (sbix)          | `NotoColorEmoji.sbix-N.woff2` slices + `sbix-partition.json`                      | noto-emoji's CBDT font + `cbdt-to-sbix.py` + `slice-emoji-sbix.py` (`notocolor.sh`) |
| F   | Finalize + verify                  | hashes/lockfile, `faces.generated.ts`, `fonts.css`, `renderable.generated.ts`     | `npm run fonts-fix` + `fonts -- --deep`                                             |

> **Note:** the mono font (C) comes from Google Fonts' **download endpoint**
> (`download/list`), which serves the current published version — newer than the
> google/fonts GitHub `main` mirror, which lags a few Unicode releases behind.
> `downloadColorEmoji.ts` re-derives the mono face's `unicode-range` from the new
> file's cmap (so it never over-claims — no tofu), and it renders monochrome
> emoji only where the color fonts aren't used.

**Order matters, and it is NOT the reading order.** `codes.txt` is filtered to the
codepoints some bundled font can actually draw (the renderable set that `fonts-fix`
regenerates), so the fonts must be built first. The real sequence is:

> **fonts (C → D → E → F's `fonts-fix`) → codes (A) → names (B) → verify**

E reads the ranges D writes; `fonts-fix` rebuilds the renderable set from every
font's cmap (mono + both color branches); then `codes` filters against it (run
`npm run codes` **after** `fonts-fix`, never before, or the renderable filter uses
stale coverage). `npm run emoji-update` sequences all of this correctly.

A and B are the **names** half; C, D, E, F are the **fonts** half. A Unicode
release and a Noto Color Emoji release don't always coincide, so each half is
runnable alone:

```bash
npm run emoji-update -- --names-only   # new Unicode version, same font
npm run emoji-update -- --fonts-only   # new Noto font, same codepoints
```

## Prerequisites (fonts half only)

The mono step (C) re-encodes a downloaded static font to woff2 (fonttools +
brotli in a throwaway venv — seconds), and the Safari rebuild (step E) shells out
to Google's `nanoemoji`, so the fonts half needs:

- **python3 + pip3** and **git** on `PATH`,
- a **nanoemoji-compatible Python**. nanoemoji's native deps (`skia-pathops`,
  `picosvg`) ship `abi3` wheels that lag the newest CPython by a release or two, so
  a brand-new `python3` (e.g. 3.14) can fail the venv install. If your default
  `python3` is too new, install an older one and run with `PYTHON=python3.12 npm
run emoji-update` — both `notocolor.sh` and `download-mono-emoji.sh` honor `$PYTHON`.
- a Unix/macOS shell (the nanoemoji build is not tested on Windows — run the fonts
  half on a Unix box),
- ~10 minutes: nanoemoji rebuilds the whole ~3.3 MB OT-SVG font before slicing.

`update.ts` checks that python3/pip3/git exist up front, but it does **not** check
the Python version — if the nanoemoji install fails, re-run with `PYTHON=` set as
above. The names half needs only network access (unicode.org + CLDR).

## The one step a script can't do: Safari visual QA

There is no headless Safari, and OT-SVG subset correctness has to be eyeballed.
After a fonts run, `emoji-update` prints a checklist. Before committing, open a
project in desktop Safari **and on an iPhone or iPad** and confirm:

- only the matching `NotoColorEmoji.svg-N.woff2` slices download in desktop
  Safari, and only `NotoColorEmoji.sbix-N.woff2` slices on iOS (not the whole font),
- emoji render from the WOFF2 slices at all (OT-SVG inside WOFF2 is a combination
  this pipeline adopted for Emoji 18),
- ZWJ sequences (families, professions, flags), skin-tone modifiers, and keycaps
  (2️⃣ #️⃣ ©️) render with **no tofu**,
- coverage matches the Chromium build.

## Why iOS gets a bitmap font

iOS 27 Safari loads an OT-SVG font and then paints none of its glyphs; iOS 26 and
desktop Safari paint the same files. The likely cause is WebKit's switch to
`CTFontHasComplexColorFormatForGlyph` to decide which glyphs need color drawing
(WebKit `46525dbf2a`, April 2026): a glyph not flagged as complex is sent to the
GPU process, which skips OT-SVG glyphs. sbix, Apple's own bitmap format, paints on
every iOS version, so iOS gets Noto's PNGs (its CBDT font, converted by
`cbdt-to-sbix.py`) under `@supports (-webkit-touch-callout: none)`, which only iOS
WebKit matches. If Apple fixes OT-SVG, this branch can go.

Bitmaps are about four times the SVG drawings' size, so `slice-emoji-sbix.py` cuts
iOS its own, finer partition (~100 slices, most under 100 KB) instead of Google's,
packed by Unicode subgroup so a project's few related emoji share a file. It rests
on how WebKit picks fonts, each checked in WebKit:

- A sequence (👍🏽, 👨‍👩‍👧, 🇯🇵) is shaped with the font of its first character, so
  each slice holds the parts and joined glyphs of the sequences its characters
  start, and declares only those starting characters.
- Every slice keeps the cmap's FE0F variation sequences: without them CoreText
  hands `♀ + FE0F` to Apple's emoji even when the slice draws it.
- `codes.txt` omits sequences with a text-default part (🏃‍♀, 👨‍⚕), so sequences
  also come from Noto's SVG filenames, which in turn omit country and tag flags.

The slicer re-shapes every owned sequence against its slice with HarfBuzz, and
fails if any glyph in the font is reachable from no slice. 👨, 👩 and 🧑 each start
hundreds of sequences and stay ~1 MB. sbix glyphs also carry an undrawn outline
around their pixels, because WebKit measures ink from outlines and CoreText places
the bitmap from the outline's bottom.

## How the color-font branches stay in sync

`emoji-faces.css` is the single source of truth for the color-emoji partition,
and one script regenerates **both** browser branches from Google's partition so
they can't drift apart on an update:

- `downloadColorEmoji.ts` fetches Google's slice partition, writes the Chromium
  woff2 files, and **regenerates all three branches** — the Chromium COLRv1
  `@supports not (-webkit-hyphens: none)` branch, the desktop Safari OT-SVG
  branch, and the iOS sbix `@supports (-webkit-touch-callout: none)` branch —
  applying the fixed **keycap trim**
  (so the color font doesn't paint plain digits/`#`/`*` as emoji) and re-emitting
  those codepoints on the dedicated `.emoji-keycap` face. The trim is encoded as
  data, so a Noto update only changes _ranges_, never the trim policy. The same
  run also re-derives the **mono** face's range from its cmap (see above).
- `notocolor.sh` builds the whole OT-SVG font with nanoemoji from the
  noto-emoji repo's `2D/svg/` sources, cloned at the **release tag** `--check`
  reported (never `main`, which moved the sources out of `svg/` underneath this
  script for Emoji 18). The clone is sparse, checking out only `2D/svg/`: the
  repo's `3D/fonts` are Git LFS files, and a full checkout fails without
  `git-lfs` installed. The whole font stays `picosvgz` (gzipped SVG documents)
  because it is committed and never served.
- `slice-emoji-svg.py` reads the Chromium ranges to cut the Safari
  `.svg-N.woff2` slice files. Each slice stores its SVG documents
  **uncompressed** before WOFF2 encoding: brotli can't compress already-gzipped
  documents, and compressing the file whole is about 28% smaller over the wire
  (3.44 MB → 2.49 MB across all slices at Unicode 17).
- `downloadColorEmoji.ts --fold-safari-gaps` runs **after** the rebuild: the
  OT-SVG font has a few standalone glyphs the Chromium partition omits (ZWJ
  sequences there, e.g. 👪), knowable only from the built font's cmap, so this
  folds them into the Safari `GAP_SLICE` (kept in lockstep with the same fold
  `slice-emoji-svg.py` applies to the font file).

A byte-for-byte guard protects the emitter, the gap fold, **and** the mono range:

```bash
npx tsx scripts/emoji/downloadColorEmoji.ts --selftest   # offline
```

reconstructs the partition from the committed CSS, re-emits both branches, folds
the committed font's gaps, re-derives the mono face's range from its cmap, and
asserts the result is identical to the committed island.
`emojiRange.test.ts` (in `npm test`) separately guards that no slice over-claims
its font's glyphs and that the slices together drop nothing.

## Rare manual sub-steps

- **Google changes the slice count.** Everything downstream reads the count from the
  CSS (`slice-emoji-svg.py`, `emojiRange.test.ts`, the lockfile), so a re-partition
  needs no hand-edit — just re-run `emoji-update` and re-verify. (Emoji 18 took it
  from 10 to 11, which is how the slicer's single-digit slice pattern was found.)
- **noto-emoji changes its layout.** `notocolor.sh` stops rather than building
  from nothing if `2D/svg/` is missing at the tag; find the new SVG directory and
  update `SVG_DIR`.

## What to commit

`static/unicode/*.txt`, `static/locales/*/*-emojis.json`,
`static/fonts/NotoEmoji/NotoEmoji-400.woff2`, `static/fonts/NotoColorEmoji/*`,
`src/basis/faces/emoji-faces.css`, the regenerated `faces.generated.ts` /
`renderable.generated.ts` / `fonts.lock.json` / `fonts*.css`, and
`scripts/emoji/versions.json` (bump its `updated` date).
