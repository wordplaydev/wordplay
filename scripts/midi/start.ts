/**
 * Convert a MIDI file into Wordplay `Music` notation.
 *
 *   npx tsx scripts/midi/start.ts song.mid [--scale minor] [--key -3]
 *                                         [--name tune] [--out song.wp]
 *
 * A thin shell: all the conversion lives in `src/output/Music/midi/`, so the
 * same code will back an in-app importer. This reads the file, prints the
 * source to stdout and the findings to stderr — so `> out.wp` gives a clean
 * file while the accounting still reaches you.
 *
 * The findings are the interesting half. They say what the notation could not
 * carry: how many tracks had to split into voices, what was dropped, and how
 * far anything moved.
 */

import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';
import importMIDI, { isFormatError } from '../../src/output/Music/midi/importMIDI';
import type { Finding } from '../../src/output/Music/midi/convert';
import { ScaleKeys, type ScaleKey } from '../../src/output/Music/scales';

/** Turn a finding into a sentence. English lives here, not in the core. */
function describe(finding: Finding): { text: string; bad: boolean } {
    const { kind, count, detail } = finding;
    switch (kind) {
        case 'tracks-split':
            return {
                text: `${count} track${count === 1 ? '' : 's'} played more than one note at a time, so ${detail?.extraTracks} extra Track${detail?.extraTracks === 1 ? ' was' : 's were'} added to hold the overlapping voices.`,
                bad: false,
            };
        case 'notes-dropped-percussion':
            return {
                text: `${count} percussion note${count === 1 ? '' : 's'} had no matching piece in our drum kit and were dropped.`,
                bad: true,
            };
        case 'tracks-truncated':
            return {
                text: `${count} track${count === 1 ? '' : 's'} past the limit of ${detail?.cap} were dropped.`,
                bad: true,
            };
        case 'pitches-snapped':
            return count === 0
                ? {
                      text: `No pitches moved: every note has an exact degree on the ${detail?.scale} scale.`,
                      bad: false,
                  }
                : {
                      text: `${count} pitches were not in the ${detail?.scale} scale and moved to the nearest degree, by up to ${detail?.maxSemitones} semitone(s).`,
                      bad: true,
                  };
        case 'beats-rounded':
            return {
                text: `${count} note lengths kept exactly, rounded by at most ${detail?.maxError} of a beat. Durations are not the lossy part.`,
                bad: false,
            };
        case 'tempo-folded':
            return {
                text: `${count} tempo change${count === 1 ? '' : 's'} folded into the note lengths, so the piece still speeds up and slows down. Music has one tempo, fixed at ${detail?.using} bpm, so a Beat will not land on the score's beats.`,
                bad: false,
            };
        case 'time-signature-changes':
            return {
                text: `${count} time signature change${count === 1 ? '' : 's'} ignored: Music does not model meter.`,
                bad: true,
            };
        case 'velocity-range':
            return {
                text: `Track ${detail?.track} spans ${count} velocity steps. Each note keeps its own volume, but there are no ramps — no crescendo, no articulation.`,
                bad: false,
            };
        case 'pitches-out-of-range':
            return {
                text: `${count} notes fall more than three octaves from the tonic; they will play, but far from any sampled zone.`,
                bad: true,
            };
    }
}

function fail(message: string): never {
    console.error(chalk.red('x ' + message));
    process.exit(1);
}

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith('--'));
if (file === undefined)
    fail('Give me a MIDI file: npx tsx scripts/midi/start.ts song.mid');

/** Read `--flag value`, or undefined when absent. */
function option(name: string): string | undefined {
    const at = args.indexOf(`--${name}`);
    return at >= 0 ? args[at + 1] : undefined;
}

const scaleName = option('scale');
if (scaleName !== undefined && !ScaleKeys.includes(scaleName as ScaleKey))
    fail(`I don't know the scale "${scaleName}". Try: ${ScaleKeys.join(', ')}`);

const keyText = option('key');
const key = keyText === undefined ? undefined : Number(keyText);
if (key !== undefined && !Number.isFinite(key))
    fail(`--key wants a number of semitones, not "${keyText}".`);

let bytes: Uint8Array;
try {
    bytes = new Uint8Array(readFileSync(file));
} catch {
    fail(`I couldn't read ${file}.`);
}

try {
    const result = importMIDI(bytes, {
        scale: scaleName as ScaleKey | undefined,
        key,
        name: option('name'),
    });

    // Two sources: the program that plays the music, and the notes it borrows.
    // `.wp` separates sources with `=== <name>` lines, so one file still holds
    // the whole project.
    const wordplay =
        `=== start\n${result.main}\n` +
        `=== ${result.sourceName}\n${result.tracks}`;

    const out = option('out');
    if (out !== undefined) {
        writeFileSync(out, wordplay + '\n');
        console.error(chalk.green(`✓ Wrote ${out}`));
    } else console.log(wordplay);

    console.error(
        chalk.green(
            `✓ ${result.noteCount} notes across ${result.trackCount} tracks.`,
        ),
    );
    for (const finding of result.findings) {
        const { text, bad } = describe(finding);
        console.error(bad ? chalk.yellow('! ' + text) : chalk.dim('  ' + text));
    }
} catch (error) {
    if (isFormatError(error)) fail(error.message);
    throw error;
}
