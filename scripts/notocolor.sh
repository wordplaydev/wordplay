# We can't use COLRv1 in Webkit (yet), which prevents us from using Noto Color Emoji universally.
# But we can convert it to SBIX, which WebKit does support:
# https://stackoverflow.com/questions/78467798/how-to-successfully-use-noto-color-emoji-font-on-safari-webkit-in-2024
# https://stackoverflow.com/questions/78467479/nanoemoji-errors-out-when-converting-svg-folder-to-colrv0-format
#
# Run this with a simple ./notocolor.sh.
# Expects python3, pip3. Install missing dependencies via package manager (e.g., brew install ...)
# The resulting SVG font will be about 3 mb, a tad larger than the COLRv1 font.

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

# Leave the virtual environment
deactivate

# Return to the scripts folder
cd ..

# Move the built font file to the static fonts folder where Wordplay expects it.
mv build/Font.ttf ../static/fonts/NotoColorEmoji/NotoColorEmoji.svg.ttf

# Clean up the repository and its files
rm -rf nanoemoji