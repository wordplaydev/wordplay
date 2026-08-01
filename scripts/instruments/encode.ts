/**
 * Encoding, and the decoding that isn't hand-rolled.
 *
 * **Format is mp3.** Universally decodable by `decodeAudioData`, including on
 * the older Safari that school hardware runs. Opus is smaller at equal
 * quality, but Safari only gained Opus-in-Ogg in 18.4, too recent a floor —
 * worth revisiting when it isn't.
 *
 * Both the encoder and the FLAC decoder are pure JS/WASM npm packages rather
 * than ffmpeg, so regenerating the palette needs nothing but `npm install`.
 * A system dependency here would mean a contributor couldn't rerun the
 * pipeline that produces committed artifacts.
 */

import lamejs from '@breezystack/lamejs';
import { FLACDecoder } from '@wasm-audio-decoders/flac';
import { OggVorbisDecoder } from '@wasm-audio-decoders/ogg-vorbis';
import type { Mono } from './audio';

/** Encode mono float audio as mp3. */
export function encodeMp3(audio: Mono, bitrate: number): Buffer {
    const encoder = new lamejs.Mp3Encoder(1, audio.rate, bitrate);
    const pcm = new Int16Array(audio.samples.length);
    for (let index = 0; index < audio.samples.length; index++) {
        const clamped = Math.max(-1, Math.min(1, audio.samples[index]));
        pcm[index] = Math.round(clamped * 32767);
    }

    const chunks: Buffer[] = [];
    // 1152 samples is one MPEG-1 Layer III granule pair; the encoder wants
    // whole frames.
    for (let index = 0; index < pcm.length; index += 1152) {
        const block = encoder.encodeBuffer(pcm.subarray(index, index + 1152));
        if (block.length > 0) chunks.push(Buffer.from(block));
    }
    const tail = encoder.flush();
    if (tail.length > 0) chunks.push(Buffer.from(tail));
    return Buffer.concat(chunks);
}

/** Fold decoded channels down to one. */
function toMono(channels: Float32Array[], rate: number): Mono {
    if (channels.length === 0 || channels[0].length === 0)
        throw new Error('decoded to no audio');
    const frames = channels[0].length;
    const samples = new Float32Array(frames);
    for (let frame = 0; frame < frames; frame++) {
        let sum = 0;
        for (const channel of channels) sum += channel[frame];
        samples[frame] = sum / channels.length;
    }
    return { samples, rate };
}

/** Decode an Ogg Vorbis file. Commons publishes most of its audio this way,
 * which is where the animal recordings come from. */
export async function decodeOgg(bytes: Buffer): Promise<Mono> {
    const decoder = new OggVorbisDecoder();
    await decoder.ready;
    try {
        const decoded = await decoder.decodeFile(new Uint8Array(bytes));
        return toMono(decoded.channelData, decoded.sampleRate);
    } finally {
        await decoder.free();
    }
}

/** Decode a FLAC file to mono float audio. */
export async function decodeFlac(bytes: Buffer): Promise<Mono> {
    const decoder = new FLACDecoder();
    await decoder.ready;
    try {
        const decoded = await decoder.decodeFile(new Uint8Array(bytes));
        return toMono(decoded.channelData, decoded.sampleRate);
    } finally {
        await decoder.free();
    }
}
