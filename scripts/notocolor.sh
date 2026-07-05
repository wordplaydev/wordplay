# We can't use COLRv1 in Webkit (yet), which prevents us from using Noto Color Emoji universally.
# But we can convert it to an SVG font, which WebKit does support:
# https://stackoverflow.com/questions/78467798/how-to-successfully-use-noto-color-emoji-font-on-safari-webkit-in-2024
# https://stackoverflow.com/questions/78467479/nanoemoji-errors-out-when-converting-svg-folder-to-colrv0-format
#
# Run this with a simple ./notocolor.sh.
#
# Expects python3, pip3. Install missing dependencies via package manager (e.g., brew install ...)
# The resulting SVG font will be about 3 mb, a tad larger than the COLRv1 font.
# Re-run this every type the Noto Color Emoji font has a new release.

# Download nanoemoji, a Google Fonts tool for converting fonts.
git clone https://github.com/googlefonts/nanoemoji.git

# Make a virtual environment
python3 -m venv nanoemoji

# Enter the virtual environment
source nanoemoji/bin/activate

# Enter the folder
cd nanoemoji

# Install the packages for nanoemoji
pip3 install -e .

# Download Noto Color Emoji
git clone https://github.com/googlefonts/noto-emoji.git

# Convert the Noto Color Emoji SVGs into COLRv0 format for WebKit compatibility
# This runs a loooooooong time (e.g. 5-10 minutes) and will look like it hangs on the last two build steps.
# But these last two steps are just really slow, so patience.
nanoemoji --color_format=picosvgz $(find ./noto-emoji/svg -name 'emoji*.svg')

# Return to the scripts folder (keep the venv active — it has fonttools).
cd ..

# Move the built (whole) font file to the static fonts folder. It stays there as
# the canonical source + the slicing input; the served CSS references the slices
# below, not this whole file.
mv nanoemoji/build/Font.ttf ../static/fonts/NotoColorEmoji/NotoColorEmoji.svg.ttf

# Slice the whole OT-SVG font into per-block files (NotoColorEmoji.svg-N.ttf) so
# Safari lazily downloads only the emoji it renders instead of the whole ~3.3 MB
# font. Mirrors the Chromium COLRv1 partition; see scripts/slice-emoji-svg.py.
# pyftsubset needs lxml to subset the SVG table (not pulled in by nanoemoji).
pip3 install --quiet lxml
python3 slice-emoji-svg.py

# Leave the virtual environment
deactivate

# Clean up the repository and its files
rm -rf nanoemoji