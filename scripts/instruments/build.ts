/**
 * Turn the manifest into shipped zones: fetch, process, encode, and write
 * both the mp3s and the zone map the runtime reads.
 *
 * The pipeline per zone, in order, and why each step is here:
 *
 * 1. **Decode** to mono float. Pan is applied at playback, so a stereo
 *    recording of one instrument is twice the bytes for nothing.
 * 2. **Trim the attack.** Libraries leave differing amounts of leading
 *    silence; untrimmed, notes land late by varying amounts and the beat grid
 *    smears.
 * 3. **Measure the fundamental** and compare it to the label. The library's
 *    root is authoritative — detection is how we catch a mislabelled file and
 *    how we compute the fine tuning offset.
 * 4. **Record the tuning offset in cents** rather than resampling. A few
 *    cents of drift between two sustained instruments beats audibly, and the
 *    player already computes a playback rate per note, so folding the
 *    correction into that is exact where a build-time resample would cost a
 *    generation of interpolation.
 * 5. **Limit length and fade the tail**, so cutting a note — which `replay`
 *    and splicing both do — never clicks.
 * 6. **Normalize to a common loudness** (BS.1770), not peak. Peak
 *    normalization would leave a close-miked drum far louder than a
 *    hall-recorded violin at the same peak.
 * 7. **Encode** to mp3 at one rate and one bitrate.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { PitchDetector } from 'pitchy';
import {
    decodeWav,
    limitLength,
    midiToFrequency,
    measureLoudness,
    measureShortTermLoudness,
    noteToMidi,
    normalize,
    refineTuning,
    resample,
    trimAttack,
    trimTail,
    type Mono,
} from './audio';
import { decodeFlac, decodeOgg, encodeMp3 } from './encode';
import {
    fetchCached,
    hashOf,
    readRemoteZipEntry,
    readRemoteZipIndex,
    readZipEntries,
    type ZipEntry,
} from './fetch';
import {
    Bitrate,
    Manifest,
    MaxDetuneCents,
    MaxLoudnessError,
    PeakCeiling,
    ReleaseFade,
    SampleRate,
    SynthesisOnly,
    TargetLoudness,
    type InstrumentSpec,
} from './manifest';
import { Sources } from './sources';
import { instrumentSpec } from '../../src/output/Music/instruments';

/** Where the shipped mp3s live; served straight from `static`. */
export const OutputDir = path.join('static', 'instruments');
/** The committed record of what was built from what. */
export const LockPath = path.join('scripts', 'instruments', 'instruments.lock.json');
/** The zone map the runtime imports. */
export const GeneratedPath = path.join(
    'src',
    'output',
    'Music',
    'samples.generated.ts',
);

export type LockZone = {
    /** Output file, relative to `static/instruments`. */
    file: string;
    /** MIDI note the recording was played at. */
    root: number;
    /** Tuning correction in cents, applied by the player. */
    detune: number;
    /** Seconds of audio. */
    duration: number;
    /** Integrated loudness before normalization, in LUFS. */
    loudness: number;
    /** Integrated loudness after normalization — the number that actually
     * matters, since the peak ceiling can bind before the target is reached. */
    normalized: number;
    /** The gain normalization applied, in dB. */
    gain: number;
    /** sha256 of the shipped mp3. */
    hash: string;
    /** sha256 of the upstream recording it came from. */
    sourceHash: string;
    /** Where it came from. */
    source: string;
    sourcePath: string;
    sourceUrl: string;
    license: string;
    author: string;
};

export type Lockfile = {
    note: string;
    /** Loudness target and encoder settings, so a drift in them is visible. */
    settings: {
        targetLoudness: number;
        peakCeiling: number;
        sampleRate: number;
        bitrate: number;
        releaseFade: number;
    };
    instruments: Record<string, LockZone[]>;
};

/** Detect the strongest pitch in the middle of a recording, where a note is
 * steady — the attack is noisy and the tail is often too quiet to track. */
function detectPitch(audio: Mono): number | undefined {
    const size = 4096;
    if (audio.samples.length < size * 2) return undefined;
    const detector = PitchDetector.forFloat32Array(size);
    const readings: { frequency: number; clarity: number }[] = [];
    const start = Math.floor(audio.samples.length * 0.15);
    const end = Math.min(audio.samples.length - size, Math.floor(audio.samples.length * 0.6));
    for (let offset = start; offset < end; offset += size) {
        const [frequency, clarity] = detector.findPitch(
            audio.samples.subarray(offset, offset + size),
            audio.rate,
        );
        if (clarity > 0.85 && frequency > 20 && frequency < 8000)
            readings.push({ frequency, clarity });
    }
    if (readings.length === 0) return undefined;
    // Median, so one octave-confused frame can't move the answer.
    readings.sort((a, b) => a.frequency - b.frequency);
    return readings[Math.floor(readings.length / 2)].frequency;
}

type Resolved = {
    /** Stable output name. */
    name: string;
    root: number | 'detect';
    bytes: Buffer;
    sourceId: string;
    sourcePath: string;
    sourceUrl: string;
    kind: 'wav' | 'flac' | 'ogg';
    license: string | undefined;
    author: string | undefined;
    page: string | undefined;
};

/** Resolve one instrument's zones to fetched bytes. */
async function resolveZones(
    instrument: InstrumentSpec,
    vscoIndex: () => Promise<Map<string, ZipEntry>>,
): Promise<Resolved[]> {
    const resolved: Resolved[] = [];

    for (const zone of instrument.zones ?? []) {
        const library = Sources[zone.source];
        if (library.delivery.kind === 'local') {
            // Committed in the repo; there is no upstream to fetch.
            const file = path.join(library.delivery.base, zone.path);
            const bytes = await readFile(file);
            resolved.push({
                name: path.basename(zone.path, path.extname(zone.path)),
                root: zone.root === 'detect' ? 'detect' : noteToMidi(zone.root),
                bytes,
                sourceId: zone.source,
                sourcePath: zone.path,
                sourceUrl: file,
                kind: 'wav',
                license: zone.license,
                author: zone.author,
                page: zone.page,
            });
            continue;
        }
        if (library.delivery.kind !== 'files')
            throw new Error(`${zone.source} does not deliver individual files`);
        // Per segment, not `encodeURI`: sharp signs are everywhere in note
        // names and `encodeURI` leaves them, so the URL loses everything
        // after the first one to the fragment.
        const url =
            library.delivery.base +
            zone.path.split('/').map(encodeURIComponent).join('/');
        const bytes = await fetchCached(
            url,
            path.join(zone.source, zone.path.replace(/[^\w.-]+/g, '_')),
        );
        resolved.push({
            name: zone.root === 'detect' ? 'root' : zone.root,
            root: zone.root === 'detect' ? 'detect' : noteToMidi(zone.root),
            bytes,
            sourceId: zone.source,
            sourcePath: zone.path,
            sourceUrl: url,
            // Libraries ship whatever format they ship; the extension is
            // the only thing that says which decoder to use.
            kind: zone.path.toLowerCase().endsWith('.flac')
                ? 'flac'
                : /\.(ogg|oga)$/.test(zone.path.toLowerCase())
                  ? 'ogg'
                  : 'wav',
            license: zone.license,
            author: zone.author,
            page: zone.page,
        });
    }

    if (instrument.pack !== undefined) {
        const library = Sources[instrument.pack.source];
        if (library.delivery.kind !== 'zip')
            throw new Error('pack source must be a zip');
        const url = library.delivery.url;
        const index = await vscoIndex();
        const entry = index.get(instrument.pack.entry);
        if (entry === undefined)
            throw new Error(`no ${instrument.pack.entry} in ${url}`);

        const cacheKey = path.join('vsco', instrument.pack.entry);
        const xrni = existsSync(path.join('node_modules/.cache/instruments', cacheKey))
            ? await fetchCached('unused', cacheKey)
            : await (async () => {
                  const blob = await readRemoteZipEntry(url, entry);
                  await mkdir(
                      path.dirname(
                          path.join('node_modules/.cache/instruments', cacheKey),
                      ),
                      { recursive: true },
                  );
                  await writeFile(
                      path.join('node_modules/.cache/instruments', cacheKey),
                      blob,
                  );
                  return blob;
              })();

        const inner = readZipEntries(xrni);
        const xml = inner.get('Instrument.xml');
        if (xml === undefined)
            throw new Error(`${instrument.pack.entry} has no Instrument.xml`);

        // Each <Sample> carries the authoritative <BaseNote>; the samples are
        // in file order, so the nth BaseNote belongs to the nth SampleData
        // entry.
        const baseNotes = [
            ...xml.toString('utf8').matchAll(/<BaseNote>(\d+)<\/BaseNote>/g),
        ].map((match) => Number(match[1]));
        const files = [...inner.keys()]
            .filter((name) => name.endsWith('.flac'))
            .sort();
        if (baseNotes.length < files.length)
            throw new Error(
                `${instrument.pack.entry}: ${files.length} samples but ${baseNotes.length} base notes`,
            );

        // One sample per root (a library may ship round robins), then thin to
        // the requested spacing.
        const byRoot = new Map<number, string>();
        files.forEach((file, index) => {
            const root = baseNotes[index];
            if (!byRoot.has(root)) byRoot.set(root, file);
        });
        const roots = [...byRoot.keys()].sort((a, b) => a - b);
        const chosen: number[] = [];
        for (const root of roots)
            if (
                chosen.length === 0 ||
                root - chosen[chosen.length - 1] >= instrument.pack.spacing
            )
                chosen.push(root);

        for (const root of chosen) {
            const file = byRoot.get(root);
            if (file === undefined) continue;
            resolved.push({
                name: String(root),
                root,
                license: undefined,
                author: undefined,
                page: undefined,
                bytes: inner.get(file) ?? Buffer.alloc(0),
                sourceId: instrument.pack.source,
                sourcePath: `${instrument.pack.entry}!${file}`,
                sourceUrl: url,
                kind: 'flac',
            });
        }
    }

    return resolved;
}

export async function build(): Promise<string[]> {
    const problems: string[] = [];
    const lock: Lockfile = {
        note: 'Generated by `npm run instruments-build`. Records what each shipped zone was built from, so a rebuild that pulls different upstream bytes fails loudly. Do not hand-edit.',
        settings: {
            targetLoudness: TargetLoudness,
            peakCeiling: PeakCeiling,
            sampleRate: SampleRate,
            bitrate: Bitrate,
            releaseFade: ReleaseFade,
        },
        instruments: {},
    };

    let index: Map<string, ZipEntry> | undefined = undefined;
    const vscoIndex = async () => {
        if (index === undefined) {
            const library = Sources.vsco;
            if (library.delivery.kind !== 'zip') throw new Error('bad source');
            index = await readRemoteZipIndex(library.delivery.url);
        }
        return index;
    };

    if (existsSync(OutputDir)) await rm(OutputDir, { recursive: true });
    await mkdir(OutputDir, { recursive: true });

    for (const instrument of Manifest) {
        const zones = await resolveZones(instrument, vscoIndex);
        const built: LockZone[] = [];
        await mkdir(path.join(OutputDir, instrument.id), { recursive: true });

        for (const zone of zones) {
            let audio =
                zone.kind === 'wav'
                    ? decodeWav(zone.bytes)
                    : zone.kind === 'ogg'
                      ? await decodeOgg(zone.bytes)
                      : await decodeFlac(zone.bytes);
            audio = resample(trimTail(trimAttack(audio)), SampleRate);

            let root: number;
            let detune = 0;
            if (zone.root === 'detect') {
                // No written pitch to refine around, so this is the one case
                // that needs blind detection.
                const measured = detectPitch(audio);
                if (measured === undefined) {
                    problems.push(
                        `${instrument.id}/${zone.name}: asked to detect the root but no stable pitch was found`,
                    );
                    continue;
                }
                // Round to the nearest semitone and keep the remainder as the
                // tuning offset.
                const exact = 69 + 12 * Math.log2(measured / 440);
                root = Math.round(exact);
                detune = Math.round((exact - root) * 100);
            } else {
                root = zone.root;
                // The library's label says which note this is; we only need
                // to know whether it drifts. Percussion has no pitch to
                // drift, and an inharmonic instrument has no energy at its
                // nominal fundamental to measure (a tubular bell's strike
                // tone is a virtual pitch implied by partials at ratios like
                // 2.47 and 4.01 — verified on VCSL's chimes), so both keep
                // their label untouched.
                if (
                    instrument.pitched !== false &&
                    instrument.inharmonic !== true
                ) {
                    const offset = refineTuning(
                        audio,
                        midiToFrequency(root),
                        MaxDetuneCents,
                    );
                    if (offset === undefined)
                        problems.push(
                            `${instrument.id}/${zone.name}: nothing periodic to measure; shipping at the labelled pitch`,
                        );
                    else detune = offset;
                }
            }

            audio = limitLength(audio, instrument.maxSeconds, ReleaseFade);
            // Struck and plucked instruments are measured by their loudest
            // moment, sustained ones by integrated loudness — see
            // measureShortTermLoudness for why.
            const struck = instrument.struck ?? instrument.pitched === false;
            const measure = struck
                ? measureShortTermLoudness
                : measureLoudness;
            const normalized = normalize(
                audio,
                TargetLoudness,
                PeakCeiling,
                measure,
            );
            const mp3 = encodeMp3(normalized.audio, Bitrate);

            // Confirm the zone actually reached the target. Where a recording
            // has a high peak-to-loudness ratio the ceiling binds first, and
            // that zone would sit quietly under everything else — the exact
            // mismatch loudness normalization exists to prevent, so it has to
            // be visible rather than silently accepted.
            const achieved = measure(normalized.audio);
            if (
                Number.isFinite(achieved) &&
                Math.abs(achieved - TargetLoudness) > MaxLoudnessError
            )
                problems.push(
                    `${instrument.id}/${zone.name}: normalized to ${achieved.toFixed(1)} LUFS, not ${TargetLoudness} (peak ceiling bound it)`,
                );

            // Named by MIDI root, not by note name: a sharp in a filename
            // becomes a URL fragment, so `piano/F#4.mp3` fetches `piano/F`
            // and every sharp zone silently fails to load — the note then
            // plays from a zone several semitones away, which sounds like a
            // bad sample rather than a missing one. Numbers are unambiguous
            // and URL-safe. A kit's pieces all share one root, so they keep
            // their own names instead, sanitized the same way.
            // A kit's pieces are named after what they are, since they all
            // share a root and a number would say nothing; the name also
            // makes the zone order visible, and that order is the degree
            // mapping.
            const kit = instrumentSpec(instrument.id)?.kit;
            const file =
                kit !== undefined && kit.length > 1
                    ? `${kit[built.length] ?? zone.name}.mp3`
                    : `${root}.mp3`;
            await writeFile(path.join(OutputDir, instrument.id, file), mp3);

            const library = Sources[zone.sourceId];
            built.push({
                file: `${instrument.id}/${file}`,
                root,
                // The player corrects toward A440, so the offset it applies is
                // the negative of how far the recording sits from the note.
                detune: -detune,
                duration:
                    normalized.audio.samples.length / normalized.audio.rate,
                loudness: Number(normalized.loudness.toFixed(2)),
                normalized: Number(achieved.toFixed(2)),
                gain: Number((20 * Math.log10(normalized.gain)).toFixed(2)),
                hash: hashOf(mp3),
                sourceHash: hashOf(zone.bytes),
                source: library.id,
                sourcePath: zone.sourcePath,
                // A zone's own licence and author win over its library's:
                // Commons hosts every licence there is, per file.
                sourceUrl: zone.page ?? zone.sourceUrl,
                license: zone.license ?? library.license,
                author: zone.author ?? library.author,
            });
        }

        // Pitched zones sort by root; a kit keeps the manifest's order,
        // because that order *is* the degree mapping.
        if (instrument.pitched !== false) built.sort((a, b) => a.root - b.root);
        lock.instruments[instrument.id] = built;
    }

    await writeFile(LockPath, JSON.stringify(lock, null, 4) + '\n');
    await writeFile(path.join(OutputDir, 'CREDITS.md'), credits(lock));
    await writeFile(GeneratedPath, generate(lock));
    return problems;
}

/**
 * The attribution file.
 *
 * CC0 asks for nothing, but not everything here is CC0 — a real dog bark
 * turned out to need CC BY, which requires credit — and there was no credits
 * surface for assets at all before this (font licences sit as loose .txt
 * files under `static/fonts/`, linked from nowhere). Generating it from the
 * lockfile means it can't drift from what actually ships.
 */
function credits(lock: Lockfile): string {
    const lines = [
        '# Instrument recordings',
        '',
        'Generated by `npm run instruments-build`. Every recording shipped in',
        '`static/instruments`, who made it, and under what licence.',
        '',
    ];
    for (const [id, zones] of Object.entries(lock.instruments)) {
        if (zones.length === 0) continue;
        lines.push(`## ${id}`, '');
        const seen = new Set<string>();
        for (const zone of zones) {
            const key = `${zone.author}|${zone.license}|${zone.sourceUrl}`;
            if (seen.has(key)) continue;
            seen.add(key);
            lines.push(
                `- ${zone.author} — ${zone.license} — <${zone.sourceUrl}>`,
            );
        }
        lines.push('');
    }
    return lines.join('\n');
}

/** Emit the zone map the runtime imports. */
function generate(lock: Lockfile): string {
    const entries = Object.entries(lock.instruments)
        .filter(([, zones]) => zones.length > 0)
        .map(([id, zones]) => {
            const list = zones
                .map(
                    (zone) =>
                        `        { file: '${zone.file}', root: ${zone.root}, detune: ${zone.detune}, duration: ${zone.duration.toFixed(3)} },`,
                )
                .join('\n');
            return `    ${id}: [\n${list}\n    ],`;
        })
        .join('\n');

    return `// Generated by \`npm run instruments-build\` from scripts/instruments/manifest.ts.
// Do not edit: run the command instead. Committed because the runtime imports
// it and because it is the record of which zones the shipped mp3s cover.

/** One recording, and the note it was played at. */
export type Zone = {
    /** Path under \`static/instruments\`. */
    file: string;
    /** MIDI note of the recording. */
    root: number;
    /** Tuning correction in cents, to bring the recording to A440. */
    detune: number;
    /** Seconds of audio. */
    duration: number;
};

/** Zones per instrument id, ascending by root. Instruments absent here play
 * their synthesized recipe: see \`SynthesisOnly\` in the manifest for why. */
export const Zones: Record<string, Zone[]> = {
${entries}
};

/** The instruments that ship recordings. */
export const SampledInstruments = Object.keys(Zones);
`;
}

/** Instruments in the palette with neither zones nor an explicit synthesis-only
 * entry — a gap someone forgot rather than a gap someone chose. */
export function unaccountedInstruments(paletteIds: string[]): string[] {
    const sampled = new Set(Manifest.map((instrument) => instrument.id));
    const synthesized = new Set(SynthesisOnly);
    return paletteIds.filter(
        (id) => !sampled.has(id) && !synthesized.has(id),
    );
}
