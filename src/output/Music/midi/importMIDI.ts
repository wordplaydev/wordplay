/**
 * The one entry point both the CLI and a future in-app importer call.
 *
 * Bytes in, Wordplay source and findings out — no files, no terminal, no
 * English. A caller that has a path reads it; a caller that has a dropped
 * `File` passes its `ArrayBuffer`. Keeping the seam here is what lets the
 * import dialog reuse this untouched.
 */

import convert, {
    type Conversion,
    type ConvertOptions,
} from '@output/Music/midi/convert';
import parseMIDI, { MIDIFormatError } from '@output/Music/midi/parseMIDI';

export type {
    Conversion,
    ConvertOptions,
    Finding,
} from '@output/Music/midi/convert';
export { MIDIFormatError } from '@output/Music/midi/parseMIDI';

/**
 * Convert a Standard MIDI File into a `Music` expression.
 *
 * Throws {@link MIDIFormatError} for bytes that aren't a readable SMF — a
 * caller showing UI should catch it and say so, since a creator picking the
 * wrong file is an ordinary mistake rather than a bug.
 */
export default function importMIDI(
    bytes: Uint8Array,
    options: ConvertOptions = {},
): Conversion {
    return convert(parseMIDI(bytes), options);
}

/** Whether these bytes look like a Standard MIDI File, for cheap validation. */
export function looksLikeMIDI(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 14 &&
        bytes[0] === 0x4d && // M
        bytes[1] === 0x54 && // T
        bytes[2] === 0x68 && // h
        bytes[3] === 0x64 // d
    );
}

/** True when a thrown value is a MIDI format problem rather than a defect. */
export function isFormatError(error: unknown): error is MIDIFormatError {
    return error instanceof MIDIFormatError;
}
