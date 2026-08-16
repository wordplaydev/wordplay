/**
 * A Standard MIDI File reader: bytes in, note events out.
 *
 * Hand-rolled rather than pulled from npm, following `decodeWav` in the
 * instruments pipeline — a MIDI file is a header chunk and some track chunks
 * of delta-timed events, which is a hundred lines of struct reading, and a
 * dependency for that is a poor trade.
 *
 * Deliberately free of Node APIs: it takes a `Uint8Array`, so the same
 * function serves the CLI (which reads a file) and a future in-app importer
 * (which hands over a dropped `File`'s bytes). No `Buffer`, no `fs`.
 */

/** One sounding note, with times still in the file's own tick units. */
export type MIDINote = {
    startTicks: number;
    durationTicks: number;
    /** 0–127, where 60 is middle C. */
    pitch: number;
    /** 0–127. */
    velocity: number;
};

export type MIDITrack = {
    /** The track's name, if it declared one. */
    name: string | undefined;
    /** The channel its notes arrived on; 9 is percussion by convention. */
    channel: number | undefined;
    /** The General MIDI program last selected on that channel, if any. */
    program: number | undefined;
    notes: MIDINote[];
};

export type ParsedMIDI = {
    /** Ticks per quarter note. */
    division: number;
    /** Tempo changes as (tick, beats per minute), in file order. */
    tempos: { ticks: number; bpm: number }[];
    /** Time signature changes as (tick, beats, beat unit). */
    timeSignatures: { ticks: number; beats: number; unit: number }[];
    tracks: MIDITrack[];
};

/** Thrown for bytes that aren't a Standard MIDI File we can read. */
export class MIDIFormatError extends Error {}

/** A variable-length quantity: seven bits per byte, high bit continues. */
function readVarLength(
    bytes: Uint8Array,
    at: number,
): { value: number; next: number } {
    let value = 0;
    let i = at;
    // Five bytes would already overflow the 28 bits SMF allows.
    for (let read = 0; read < 5; read++) {
        if (i >= bytes.length)
            throw new MIDIFormatError(
                'File ended inside a variable-length value.',
            );
        const byte = bytes[i++];
        value = (value << 7) | (byte & 0x7f);
        if ((byte & 0x80) === 0) return { value, next: i };
    }
    throw new MIDIFormatError('A variable-length value ran too long.');
}

function readUInt32(view: DataView, at: number): number {
    return view.getUint32(at, false);
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
    let out = '';
    for (let i = 0; i < length; i++) out += String.fromCharCode(bytes[at + i]);
    return out;
}

/** Decode a meta event's bytes as text, which SMF leaves as unspecified 8-bit. */
function text(bytes: Uint8Array, at: number, length: number): string {
    let out = '';
    for (let i = 0; i < length; i++) out += String.fromCharCode(bytes[at + i]);
    return out.trim();
}

/**
 * Read a Standard MIDI File. Formats 0, 1, and 2 all parse the same way here:
 * every chunk's events are collected, and format only governs how a player
 * would combine them, which is not our problem — we keep tracks separate.
 */
export default function parseMIDI(bytes: Uint8Array): ParsedMIDI {
    if (bytes.length < 14 || ascii(bytes, 0, 4) !== 'MThd')
        throw new MIDIFormatError('Not a MIDI file: no MThd header.');

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const headerLength = readUInt32(view, 4);
    const division = view.getUint16(12, false);

    // A negative division is SMPTE timecode, which measures in frames rather
    // than beats. Music has no frame concept, so refuse rather than silently
    // treat frames as ticks.
    if ((division & 0x8000) !== 0)
        throw new MIDIFormatError(
            'This file is timed in SMPTE frames rather than beats.',
        );
    if (division === 0)
        throw new MIDIFormatError('This file declares zero ticks per beat.');

    const tempos: ParsedMIDI['tempos'] = [];
    const timeSignatures: ParsedMIDI['timeSignatures'] = [];
    const tracks: MIDITrack[] = [];

    let at = 8 + headerLength;
    while (at + 8 <= bytes.length) {
        const kind = ascii(bytes, at, 4);
        const length = readUInt32(view, at + 4);
        const start = at + 8;
        const end = Math.min(start + length, bytes.length);
        at = start + length;

        // Chunks we don't know are skipped, which the spec requires.
        if (kind !== 'MTrk') continue;

        const notes: MIDINote[] = [];
        /** Note-ons awaiting their note-off, keyed by pitch. */
        const sounding = new Map<
            number,
            { ticks: number; velocity: number }[]
        >();
        let name: string | undefined;
        let channel: number | undefined;
        let program: number | undefined;
        let ticks = 0;
        let status = 0;
        let i = start;

        while (i < end) {
            const delta = readVarLength(bytes, i);
            ticks += delta.value;
            i = delta.next;
            if (i >= end) break;

            // Running status: a byte under 0x80 reuses the previous status.
            if (bytes[i] & 0x80) status = bytes[i++];
            const kindNibble = status & 0xf0;

            if (status === 0xff) {
                const type = bytes[i++];
                const meta = readVarLength(bytes, i);
                const dataAt = meta.next;
                const dataLength = meta.value;
                if (type === 0x03 && name === undefined)
                    name = text(bytes, dataAt, dataLength) || undefined;
                else if (type === 0x51 && dataLength === 3) {
                    const microseconds =
                        (bytes[dataAt] << 16) |
                        (bytes[dataAt + 1] << 8) |
                        bytes[dataAt + 2];
                    if (microseconds > 0)
                        tempos.push({ ticks, bpm: 60_000_000 / microseconds });
                } else if (type === 0x58 && dataLength >= 2)
                    timeSignatures.push({
                        ticks,
                        beats: bytes[dataAt],
                        unit: 2 ** bytes[dataAt + 1],
                    });
                i = dataAt + dataLength;
            } else if (status === 0xf0 || status === 0xf7) {
                const sysex = readVarLength(bytes, i);
                i = sysex.next + sysex.value;
            } else if (kindNibble === 0x90 || kindNibble === 0x80) {
                const pitch = bytes[i];
                const velocity = bytes[i + 1];
                i += 2;
                if (channel === undefined) channel = status & 0x0f;
                // A note-on with zero velocity is a note-off, which most
                // files use so they can lean on running status.
                if (kindNibble === 0x90 && velocity > 0) {
                    const queue = sounding.get(pitch) ?? [];
                    queue.push({ ticks, velocity });
                    sounding.set(pitch, queue);
                } else {
                    const queue = sounding.get(pitch);
                    const started = queue?.shift();
                    if (started !== undefined)
                        notes.push({
                            startTicks: started.ticks,
                            durationTicks: Math.max(0, ticks - started.ticks),
                            pitch,
                            velocity: started.velocity,
                        });
                }
            } else if (kindNibble === 0xc0) {
                if (program === undefined) program = bytes[i];
                if (channel === undefined) channel = status & 0x0f;
                i += 1;
            } else if (kindNibble === 0xd0) {
                i += 1;
            } else if (
                kindNibble === 0xa0 ||
                kindNibble === 0xb0 ||
                kindNibble === 0xe0
            ) {
                i += 2;
            } else {
                throw new MIDIFormatError(
                    `Unreadable event type ${status.toString(16)} in a track.`,
                );
            }
        }

        // Notes still held when the track ended: give them what's left rather
        // than dropping them, since a missing note-off is common in the wild.
        for (const [pitch, queue] of sounding)
            for (const started of queue)
                notes.push({
                    startTicks: started.ticks,
                    durationTicks: Math.max(0, ticks - started.ticks),
                    pitch,
                    velocity: started.velocity,
                });

        notes.sort((a, b) => a.startTicks - b.startTicks || a.pitch - b.pitch);
        tracks.push({ name, channel, program, notes });
    }

    if (tracks.length === 0)
        throw new MIDIFormatError('This file has no track chunks.');

    return { division, tempos, timeSignatures, tracks };
}
