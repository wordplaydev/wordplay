# Contributed recordings

Almost every instrument is built from a CC0 library the pipeline downloads on
demand, so nothing needs committing. These are the exception: recordings
someone made for Wordplay, with no upstream to fetch them from. They are
committed, and the lockfile's hashes attest to them rather than checking them
against a source.

## cat

Twelve recordings of one cat, by Amy J. Ko, released to the public domain.
They become a **kit** rather than a pitched instrument: a degree picks which
thing the cat is saying, the way a degree on `drums` picks bass or snare.
Zone order is the degree order, and it runs dark to bright by spectral
centroid, the way a drum kit runs low to high.

Both formats are kept on purpose:

- **`.m4a`** — the originals as recorded. Nothing is derived from these at
  build time; they are here so the true source is never lost.
- **`.wav`** — what the pipeline actually reads, decoded once from the m4a
  with `afconvert -f WAVE -d LEI16@44100 -c 1`. AAC has no pure-JS decoder
  worth depending on, and requiring one at build time would mean a
  contributor couldn't regenerate the palette with `npm install` alone.

To add more: drop the recording in, convert it to mono 44.1kHz WAV, add a
`local(...)` zone to `manifest.ts`, extend the instrument's `kit` array in
`src/output/Music/instruments.ts` to match, and run `npm run instruments-build`.
The kit array and the zone list must stay the same length — a test enforces
it, because a mismatch silently maps degrees to the wrong sound.
