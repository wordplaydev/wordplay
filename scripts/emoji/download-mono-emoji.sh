# Refresh the monochrome Noto Emoji font (static/fonts/NotoEmoji/NotoEmoji-400.woff2).
# Normally run via `npm run emoji-update` (fonts half); or directly with
# `./download-mono-emoji.sh` from scripts/emoji/.
#
# The mono font is a normal font — NO nanoemoji/OT-SVG Safari build — but
# instancing the variable font at weight 400 and encoding woff2 needs fonttools
# + brotli, installed here into a throwaway venv. Override the interpreter with
# PYTHON=python3.12 if your default python3 is too new for the wheels.

# Run from this script's own directory so the venv + relative paths resolve
# regardless of the caller's cwd.
cd "$(dirname "$0")"

"${PYTHON:-python3}" -m venv .mono-venv
source .mono-venv/bin/activate
pip3 install --quiet fonttools brotli
python3 download-mono-emoji.py
deactivate
rm -rf .mono-venv
