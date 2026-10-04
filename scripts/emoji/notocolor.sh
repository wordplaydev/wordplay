# We can't use COLRv1 in Webkit (yet), which prevents us from using Noto Color Emoji universally.
# But we can convert it to an SVG font, which WebKit does support:
# https://stackoverflow.com/questions/78467798/how-to-successfully-use-noto-color-emoji-font-on-safari-webkit-in-2024
# https://stackoverflow.com/questions/78467479/nanoemoji-errors-out-when-converting-svg-folder-to-colrv0-format
#
# Normally run via `npm run emoji-update` (the fonts half); or directly with
# `./notocolor.sh` from scripts/emoji/.
#
# Expects python3, pip3. Install missing dependencies via package manager (e.g., brew install ...)
# The resulting SVG font will be about 3 mb, a tad larger than the COLRv1 font.
# Re-run this every time the Noto Color Emoji font has a new release.

# Stop at the first failure: continuing past a missing source directory would
# re-slice the previous release's whole font against the new partition.
set -euo pipefail

# Run from this script's own directory so the relative paths below resolve
# regardless of the caller's cwd.
cd "$(dirname "$0")"

# The noto-emoji release to build from. update.ts passes the one --check
# reported; run directly, fall back to the pinned version in versions.json.
NOTO_TAG="${NOTO_TAG:-$(sed -n 's/.*"notoColorEmoji": *"\([^"]*\)".*/\1/p' versions.json)}"
if [ -z "$NOTO_TAG" ] || [ "$NOTO_TAG" = "?" ]; then
    echo "No noto-emoji release tag to build from (NOTO_TAG)." >&2
    exit 1
fi

# Download nanoemoji, a Google Fonts tool for converting fonts. Clear what a
# failed earlier run left behind, or the clone refuses to start.
rm -rf nanoemoji NotoColorEmoji.cbdt.ttf NotoColorEmoji.sbix.ttf
git clone https://github.com/googlefonts/nanoemoji.git

# Make a virtual environment. Override the interpreter with PYTHON=python3.12 if
# your default python3 is too new for nanoemoji's native deps (skia-pathops /
# picosvg / lxml wheels can lag the newest CPython by a release or two).
"${PYTHON:-python3}" -m venv nanoemoji

# Enter the virtual environment
source nanoemoji/bin/activate

# Enter the folder
cd nanoemoji

# Install the packages for nanoemoji
pip3 install -e .

# Download Noto Color Emoji at the release tag, checking out only the 2D SVGs:
# the repo also carries 3D PNGs and Git LFS fonts this build never reads, and a
# full checkout fails outright without git-lfs installed.
git clone --depth 1 --branch "$NOTO_TAG" --filter=blob:none --sparse \
    https://github.com/googlefonts/noto-emoji.git
git -C noto-emoji sparse-checkout set 2D/svg

# Convert the Noto Color Emoji SVGs (under 2D/svg since the Emoji 18 release)
# into an OT-SVG font for WebKit. picosvgz gzips each SVG document, which keeps
# this committed whole font small; slice-emoji-svg.py stores the served slices'
# documents uncompressed so WOFF2's brotli can compress across them.
# This runs a loooooooong time (e.g. 5-10 minutes) and will look like it hangs on the last two build steps.
# But these last two steps are just really slow, so patience.
# set -e can't see a failed find inside the substitution, so check the source.
SVG_DIR=./noto-emoji/2D/svg
if [ ! -d "$SVG_DIR" ]; then
    echo "noto-emoji $NOTO_TAG has no $SVG_DIR; its layout changed again." >&2
    exit 1
fi
nanoemoji --color_format=picosvgz $(find "$SVG_DIR" -name 'emoji*.svg')

# Return to the scripts folder (keep the venv active — it has fonttools).
cd ..

# Move the built (whole) font file to the static fonts folder. It stays there as
# the canonical source + the slicing input; the served CSS references the slices
# below, not this whole file.
mv nanoemoji/build/Font.ttf ../../static/fonts/NotoColorEmoji/NotoColorEmoji.svg.ttf

# iOS 27 Safari loads an OT-SVG font but paints none of its glyphs, so iOS gets
# Noto's own bitmap font (CBDT) converted to sbix, Apple's bitmap format. It's
# ~10 MB of PNGs, so only its slices are kept, not the whole font.
# Pillow reads each PNG's visible pixels for the glyph's measuring outline.
pip3 install --quiet pillow
curl -sSfL -o NotoColorEmoji.cbdt.ttf \
    "https://raw.githubusercontent.com/googlefonts/noto-emoji/$NOTO_TAG/2D/fonts/NotoColorEmoji.ttf"
python3 cbdt-to-sbix.py NotoColorEmoji.cbdt.ttf NotoColorEmoji.sbix.ttf

# Slice both whole fonts into per-block files (NotoColorEmoji.svg-N.woff2 and
# NotoColorEmoji.sbix-N.woff2) so Safari lazily downloads only the emoji it
# renders instead of a whole ~3 MB font. Mirrors the Chromium COLRv1 partition; see slice-emoji-svg.py.
# pyftsubset needs lxml to subset the SVG table and brotli to write WOFF2
# (neither is pulled in by nanoemoji).
pip3 install --quiet lxml brotli
python3 slice-emoji-svg.py NotoColorEmoji.sbix.ttf

# Leave the virtual environment
deactivate

# Clean up the repository and its files
rm -rf nanoemoji NotoColorEmoji.cbdt.ttf NotoColorEmoji.sbix.ttf