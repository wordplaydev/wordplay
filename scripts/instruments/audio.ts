/**
 * Audio processing for the instrument pipeline: everything that turns a
 * downloaded recording into a zone we can ship. Pure functions over
 * Float32Array, so the parts that decide *what the audio becomes* are
 * testable without decoding anything.
 *
 * All of this runs at build time. The browser only ever sees the finished
 * mp3s and the zone map.
 */

/** Mono audio at a known rate. */
export type Mono = {
    samples: Float32Array;
    rate: number;
};

/* -------------------------------------------------------------------------
 * WAV decoding
 *
 * Hand-rolled rather than pulled from npm: the libraries in reach either
 * don't handle the 24-bit PCM that VCSL ships or add a dependency for eighty
 * lines of struct reading.
 * ---------------------------------------------------------------------- */

export function decodeWav(buffer: Buffer): Mono {
    if (buffer.toString('ascii', 0, 4) !== 'RIFF')
        throw new Error('not a RIFF file');
    if (buffer.toString('ascii', 8, 12) !== 'WAVE')
        throw new Error('not a WAVE file');

    let position = 12;
    let format:
        | { tag: number; channels: number; rate: number; bits: number }
        | undefined = undefined;
    let data: Buffer | undefined = undefined;

    while (position + 8 <= buffer.length) {
        const id = buffer.toString('ascii', position, position + 4);
        const size = buffer.readUInt32LE(position + 4);
        if (id === 'fmt ')
            format = {
                tag: buffer.readUInt16LE(position + 8),
                channels: buffer.readUInt16LE(position + 10),
                rate: buffer.readUInt32LE(position + 12),
                bits: buffer.readUInt16LE(position + 22),
            };
        else if (id === 'data') {
            data = buffer.subarray(position + 8, position + 8 + size);
            break;
        }
        position += 8 + size + (size % 2);
    }

    if (format === undefined || data === undefined)
        throw new Error('missing fmt or data chunk');
    // 1 = PCM, 0xFFFE = WAVE_FORMAT_EXTENSIBLE (still PCM for these files).
    if (format.tag !== 1 && format.tag !== 0xfffe)
        throw new Error(`unsupported WAV format tag ${format.tag}`);

    const bytes = format.bits / 8;
    const frames = Math.floor(data.length / (bytes * format.channels));
    const samples = new Float32Array(frames);
    for (let frame = 0; frame < frames; frame++) {
        let sum = 0;
        for (let channel = 0; channel < format.channels; channel++) {
            const offset = (frame * format.channels + channel) * bytes;
            sum += readSample(data, offset, bytes);
        }
        // Mix to mono: pan is applied at playback, and mono halves the bytes
        // we ship for no audible loss on a single instrument recording.
        samples[frame] = sum / format.channels;
    }
    return { samples, rate: format.rate };
}

function readSample(data: Buffer, offset: number, bytes: number): number {
    if (bytes === 1) return (data[offset] - 128) / 128;
    if (bytes === 2) return data.readInt16LE(offset) / 32768;
    if (bytes === 3) {
        const raw =
            data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
        return (raw & 0x800000 ? raw - 0x1000000 : raw) / 8388608;
    }
    if (bytes === 4) return data.readInt32LE(offset) / 2147483648;
    throw new Error(`unsupported sample width ${bytes * 8}`);
}

/* -------------------------------------------------------------------------
 * Trimming and shaping
 * ---------------------------------------------------------------------- */

/**
 * Anything below this counts as silence when finding the attack.
 *
 * Low enough for a studio library, which is what most of the palette is. A
 * recording made in a room has a noise floor far above this, so its silence
 * never falls under the threshold and nothing is trimmed at all — which is why
 * an instrument can override it (see `silenceFloor` in the manifest).
 */
export const DefaultSilenceFloor = -60;
/** Keep a little of the run-up so the transient isn't clipped off. */
const PreAttackSeconds = 0.005;

/** A dBFS threshold as a sample amplitude. */
function amplitude(dbfs: number): number {
    return 10 ** (dbfs / 20);
}

/**
 * Drop leading silence. Libraries leave differing amounts of it, and
 * untrimmed, notes land late by varying amounts and the beat grid smears —
 * this is the single most audible of the alignment steps.
 */
export function trimAttack(
    audio: Mono,
    floorDb = DefaultSilenceFloor,
): Mono {
    const floor = amplitude(floorDb);
    let start = 0;
    while (start < audio.samples.length && Math.abs(audio.samples[start]) < floor)
        start++;
    if (start >= audio.samples.length) return audio;
    const back = Math.max(0, start - Math.round(PreAttackSeconds * audio.rate));
    return { samples: audio.samples.subarray(back), rate: audio.rate };
}

/**
 * Drop trailing near-silence, keeping a short tail so a decay isn't cut off.
 *
 * Attack trimming aligns the start; this keeps a one-shot from carrying
 * seconds of room tone after it, which both wastes bytes and — because
 * loudness normalization then has to raise that noise too — makes a quiet
 * recording hiss. Hand-recorded material needs it most: a phone recording of
 * a cat can be a fifth sound and four fifths room.
 */
export function trimTail(
    audio: Mono,
    floorDb = DefaultSilenceFloor,
    keepSeconds = 0.12,
): Mono {
    const floor = amplitude(floorDb);
    let end = audio.samples.length - 1;
    while (end > 0 && Math.abs(audio.samples[end]) < floor) end--;
    if (end <= 0) return audio;
    const keep = Math.min(
        audio.samples.length,
        end + 1 + Math.round(keepSeconds * audio.rate),
    );
    return { samples: audio.samples.subarray(0, keep), rate: audio.rate };
}

/**
 * Cap the length and fade the end out. A piano note rings for ten seconds and
 * we neither need nor want to ship that; the fade means cutting a note —
 * which `replay` and splicing both do — never clicks.
 */
export function limitLength(
    audio: Mono,
    maxSeconds: number,
    fadeSeconds: number,
): Mono {
    const maxFrames = Math.round(maxSeconds * audio.rate);
    const length = Math.min(audio.samples.length, maxFrames);
    const out = new Float32Array(audio.samples.subarray(0, length));
    const fade = Math.min(Math.round(fadeSeconds * audio.rate), length);
    for (let index = 0; index < fade; index++) {
        // Equal-power-ish: a linear ramp on amplitude is enough at these
        // lengths and avoids a discontinuity in the derivative.
        const gain = index / fade;
        out[length - 1 - index] *= gain;
    }
    return { samples: out, rate: audio.rate };
}

/** Resample by linear interpolation. Only used when a source's rate differs
 * from the target; the libraries we draw on are already 44.1k, so this is a
 * safety net rather than a quality-critical path. */
export function resample(audio: Mono, rate: number): Mono {
    if (audio.rate === rate) return audio;
    const ratio = audio.rate / rate;
    const length = Math.floor(audio.samples.length / ratio);
    const out = new Float32Array(length);
    for (let index = 0; index < length; index++) {
        const source = index * ratio;
        const low = Math.floor(source);
        const high = Math.min(low + 1, audio.samples.length - 1);
        const fraction = source - low;
        out[index] =
            audio.samples[low] * (1 - fraction) +
            audio.samples[high] * fraction;
    }
    return { samples: out, rate };
}

/* -------------------------------------------------------------------------
 * Loudness (ITU-R BS.1770-4)
 *
 * Loudness, not peak: peak normalization would leave a close-miked darbuka
 * far louder than a hall-recorded violin at the same peak — exactly what a
 * creator hears the moment they put two tracks together.
 * ---------------------------------------------------------------------- */

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

/** The two K-weighting stages, as specified for 48kHz and re-derived for
 * other rates by matching the analogue prototype's pole/zero positions. */
function kWeighting(rate: number): [Biquad, Biquad] {
    // Stage 1: high-shelf (+4dB above ~1.5kHz).
    const db = 3.999843853973347;
    const f0 = 1681.974450955533;
    const q = 0.7071752369554196;
    const k = Math.tan((Math.PI * f0) / rate);
    const vh = 10 ** (db / 20);
    const vb = vh ** 0.4996667741545416;
    const denominator = 1 + k / q + k * k;
    const shelf: Biquad = {
        b0: (vh + (vb * k) / q + k * k) / denominator,
        b1: (2 * (k * k - vh)) / denominator,
        b2: (vh - (vb * k) / q + k * k) / denominator,
        a1: (2 * (k * k - 1)) / denominator,
        a2: (1 - k / q + k * k) / denominator,
    };

    // Stage 2: high-pass (RLB weighting) at ~38Hz.
    const f2 = 38.13547087602444;
    const q2 = 0.5003270373238773;
    const k2 = Math.tan((Math.PI * f2) / rate);
    const highpass: Biquad = {
        b0: 1,
        b1: -2,
        b2: 1,
        a1: (2 * (k2 * k2 - 1)) / (1 + k2 / q2 + k2 * k2),
        a2: (1 - k2 / q2 + k2 * k2) / (1 + k2 / q2 + k2 * k2),
    };

    return [shelf, highpass];
}

function biquad(samples: Float32Array, filter: Biquad): Float32Array {
    const out = new Float32Array(samples.length);
    let x1 = 0,
        x2 = 0,
        y1 = 0,
        y2 = 0;
    for (let index = 0; index < samples.length; index++) {
        const x0 = samples[index];
        const y0 =
            filter.b0 * x0 +
            filter.b1 * x1 +
            filter.b2 * x2 -
            filter.a1 * y1 -
            filter.a2 * y2;
        out[index] = y0;
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
    }
    return out;
}

/**
 * Integrated loudness in LUFS, with the absolute (-70 LUFS) and relative
 * (-10 LU) gates the spec requires. Returns -Infinity for silence.
 */
export function measureLoudness(audio: Mono): number {
    const [shelf, highpass] = kWeighting(audio.rate);
    const weighted = biquad(biquad(audio.samples, shelf), highpass);

    // 400ms blocks overlapping by 75%, as specified.
    const blockFrames = Math.round(0.4 * audio.rate);
    const step = Math.round(blockFrames / 4);
    if (weighted.length < blockFrames) {
        // Shorter than one block (many percussion hits): measure what's
        // there rather than reporting silence.
        return blockLoudness(weighted, 0, weighted.length);
    }

    const blocks: number[] = [];
    for (let start = 0; start + blockFrames <= weighted.length; start += step)
        blocks.push(blockLoudness(weighted, start, blockFrames));

    // Absolute gate.
    const above = blocks.filter((loudness) => loudness > -70);
    if (above.length === 0) return -Infinity;
    // Relative gate, computed from the absolute-gated mean.
    const relative = meanLoudness(above) - 10;
    const gated = above.filter((loudness) => loudness > relative);
    return meanLoudness(gated.length > 0 ? gated : above);
}

function blockLoudness(
    weighted: Float32Array,
    start: number,
    length: number,
): number {
    let sum = 0;
    for (let index = start; index < start + length; index++)
        sum += weighted[index] * weighted[index];
    const mean = sum / length;
    return mean <= 0 ? -Infinity : -0.691 + 10 * Math.log10(mean);
}

function meanLoudness(blocks: number[]): number {
    let sum = 0;
    for (const loudness of blocks) sum += 10 ** (loudness / 10);
    return 10 * Math.log10(sum / blocks.length);
}

/**
 * The loudest 400ms window, in LUFS.
 *
 * Integrated loudness is the right measure for sustained material and the
 * wrong one for a percussion one-shot: a hi-hat is over in a few hundred
 * milliseconds, so gating and averaging read it as far quieter than it sounds,
 * and normalizing to that estimate drives its transient into the peak ceiling
 * before the target is met. What you perceive from a hit is its loudest
 * moment, which is what this measures.
 */
export function measureShortTermLoudness(audio: Mono): number {
    const [shelf, highpass] = kWeighting(audio.rate);
    const weighted = biquad(biquad(audio.samples, shelf), highpass);
    const blockFrames = Math.round(0.4 * audio.rate);
    if (weighted.length <= blockFrames)
        return blockLoudness(weighted, 0, weighted.length);
    const step = Math.max(1, Math.round(blockFrames / 8));
    let loudest = -Infinity;
    for (let start = 0; start + blockFrames <= weighted.length; start += step)
        loudest = Math.max(loudest, blockLoudness(weighted, start, blockFrames));
    return loudest;
}

/**
 * Normalize to a target loudness, then guarantee headroom. The gain the
 * loudness target asks for can push transients past full scale — percussion
 * especially — so the peak ceiling wins where they disagree.
 */
export function normalize(
    audio: Mono,
    targetLufs: number,
    peakCeiling: number,
    measure: (audio: Mono) => number = measureLoudness,
): { audio: Mono; gain: number; loudness: number } {
    const loudness = measure(audio);
    let gain = Number.isFinite(loudness) ? 10 ** ((targetLufs - loudness) / 20) : 1;

    let peak = 0;
    for (const sample of audio.samples) peak = Math.max(peak, Math.abs(sample));
    if (peak * gain > peakCeiling && peak > 0) gain = peakCeiling / peak;

    const out = new Float32Array(audio.samples.length);
    for (let index = 0; index < audio.samples.length; index++)
        out[index] = audio.samples[index] * gain;
    return { audio: { samples: out, rate: audio.rate }, gain, loudness };
}

/* -------------------------------------------------------------------------
 * Pitch
 * ---------------------------------------------------------------------- */

/** Concert A, the reference every instrument is tuned against. */
export const A440 = 440;

/** MIDI note number → frequency, equal temperament at A440. */
export function midiToFrequency(midi: number): number {
    return A440 * 2 ** ((midi - 69) / 12);
}

/** How far a measured frequency sits from a note, in cents. */
export function centsOff(measured: number, expected: number): number {
    return 1200 * Math.log2(measured / expected);
}

/**
 * How far a recording of a *known* note sits from concert pitch, in cents.
 *
 * This deliberately refines around the expected frequency rather than
 * detecting the pitch from scratch. Blind monophonic detection is defeated by
 * exactly the material here: a piano's third harmonic can outweigh its
 * fundamental (measured on VCSL's C3, where the fundamental is present and
 * dead-on but sits at half the magnitude of the 3rd), so a detector reports a
 * confident answer that is a whole interval away. We already know which note
 * the file is; the only open question is whether it drifts a few cents, and
 * constraining the search to ±60 cents makes an octave error impossible.
 *
 * Scoring sums the first few harmonics, so it doesn't matter which one
 * carries the energy.
 */
export function refineTuning(
    audio: Mono,
    expectedHz: number,
    maxCents = 60,
): number | undefined {
    const window = 16384;
    if (audio.samples.length < window) return undefined;
    // Measure past the attack, where the note is steady.
    const start = Math.min(
        Math.floor(audio.samples.length * 0.2),
        audio.samples.length - window,
    );
    const segment = audio.samples.subarray(start, start + window);

    // Hann window, so leakage doesn't smear neighbouring cents together.
    const windowed = new Float64Array(window);
    for (let index = 0; index < window; index++)
        windowed[index] =
            segment[index] *
            (0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (window - 1)));

    let bestCents: number | undefined = undefined;
    let bestScore = -Infinity;
    for (let cents = -maxCents; cents <= maxCents; cents++) {
        const frequency = expectedHz * 2 ** (cents / 1200);
        let score = 0;
        for (let harmonic = 1; harmonic <= 6; harmonic++) {
            const target = frequency * harmonic;
            if (target > audio.rate / 2) break;
            score += magnitudeAt(windowed, audio.rate, target) / harmonic;
        }
        if (score > bestScore) {
            bestScore = score;
            bestCents = cents;
        }
    }
    // A flat response means there's nothing periodic to lock onto.
    return bestScore > 0 ? bestCents : undefined;
}

/** Single-bin DFT magnitude (Goertzel-style), decimated for speed. */
function magnitudeAt(
    windowed: Float64Array,
    rate: number,
    frequency: number,
): number {
    const omega = (2 * Math.PI * frequency) / rate;
    let real = 0;
    let imaginary = 0;
    // Every 4th sample: we're comparing magnitudes across a narrow band, not
    // reconstructing a spectrum, and this keeps a full build to seconds.
    for (let index = 0; index < windowed.length; index += 4) {
        const angle = omega * index;
        real += windowed[index] * Math.cos(angle);
        imaginary -= windowed[index] * Math.sin(angle);
    }
    return Math.hypot(real, imaginary);
}

/** Note name (`C4`, `A#3`, `F#-1`) → MIDI number. */
export function noteToMidi(note: string): number {
    const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note.trim());
    if (match === null) throw new Error(`unparsable note name "${note}"`);
    const naturals: Record<string, number> = {
        c: 0,
        d: 2,
        e: 4,
        f: 5,
        g: 7,
        a: 9,
        b: 11,
    };
    const semitone =
        naturals[match[1].toLowerCase()] +
        (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
    // MIDI 60 is C4, so octave n starts at 12 * (n + 1).
    return semitone + 12 * (Number(match[3]) + 1);
}
