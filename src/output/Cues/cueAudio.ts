/**
 * Sounds the cues that `cues.ts` decides on: the impure half, mirroring how
 * `MusicAudio` keeps its graph apart from the policy it serves. Every path here
 * is a no-op where there is no Web Audio (Node, JSDOM) or where the context is
 * suspended, so a cue never throws and never resumes outside a gesture.
 */

import { get } from 'svelte/store';
import { animationCues, contactCues, cues, haptics } from '@db/Database';
import supportsVibration from '@db/settings/supportsVibration';
import audio from '@output/Music/MusicAudio';
import {
    Cues,
    gateOf,
    MinimumCueMs,
    type CueEvent,
    type CueSpec,
    type ScheduledCue,
} from './cues';
import type { PoseCue } from '@output/Cues/figure';

/** How long a noise cue's buffer is; longer than any cue, and reused. */
const NoiseSeconds = 0.25;

/** The cue bus's own gain. Cues are quiet by construction — they punctuate a
 * program rather than compete with it. */
const BusGain = 0.9;

let bus: GainNode | undefined = undefined;
let noise: AudioBuffer | undefined = undefined;

/**
 * The cue bus, connected to the destination through a limiter of its own.
 *
 * Deliberately not connected to the music master: a cue must not be ducked and
 * must not be scaled by the music volume setting. A viewer's accessibility cue
 * is not the creator's to quiet.
 */
function connect(context: AudioContext): GainNode {
    if (bus === undefined) {
        bus = context.createGain();
        bus.gain.value = BusGain;
        // Its own limiter, since the bus deliberately misses the music's. A
        // polyphonic cue sums an unbounded number of clicks — 32 letters
        // landing at once is a real stage — and without this the sum clips.
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 6;
        limiter.ratio.value = 12;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.12;
        bus.connect(limiter);
        limiter.connect(context.destination);
    }
    return bus;
}

function noiseBuffer(context: AudioContext): AudioBuffer {
    if (noise === undefined) {
        const samples = Math.floor(context.sampleRate * NoiseSeconds);
        noise = context.createBuffer(1, samples, context.sampleRate);
        const data = noise.getChannelData(0);
        // A fixed pseudo-random fill rather than Math.random, so a cue sounds
        // the same every time — a cue that varies is a different cue.
        let seed = 0x2f6e2b1;
        for (let index = 0; index < samples; index++) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            data[index] = (seed / 0x3fffffff - 1) * 0.6;
        }
    }
    return noise;
}

/** What one scheduled pulse needs, beyond the timbre its spec fixes. */
type Pulse = {
    hz: number;
    /** Audio-clock time to sound it. */
    at: number;
    gain: number;
    ms: number;
    /** −1 left to 1 right; omitted is centered. */
    pan?: number;
    /** 0-1, how open the tone is. Omitted leaves it unfiltered. */
    bright?: number;
};

/** A sounding or scheduled voice, which a cancel can take back. */
type Voice = { cancel(): void };

/** Schedule one pulse of a cue on the audio clock. */
function pulse(context: AudioContext, spec: CueSpec, options: Pulse): Voice {
    const seconds = Math.max(MinimumCueMs, options.ms) / 1000;
    const at = options.at;
    const envelope = context.createGain();
    // A short attack rather than an instant one: an abrupt start is a click,
    // which is the one thing every cue would then have in common.
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(options.gain, at + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + seconds);

    // Panning is how an animation says which way something moved, so the node
    // only exists where a cue asked for it.
    if (options.pan === undefined) envelope.connect(connect(context));
    else {
        const panner = context.createStereoPanner();
        panner.pan.value = Math.min(1, Math.max(-1, options.pan));
        envelope.connect(panner);
        panner.connect(connect(context));
    }

    let source: AudioScheduledSourceNode;
    if (spec.source === 'noise') {
        const noiseSource = context.createBufferSource();
        noiseSource.buffer = noiseBuffer(context);
        const band = context.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = options.hz;
        band.Q.value = 6;
        noiseSource.connect(band);
        band.connect(envelope);
        source = noiseSource;
    } else {
        const tone = context.createOscillator();
        tone.type = 'triangle';
        tone.frequency.value = options.hz;
        // Color has nowhere else to go, so it opens or closes the tone.
        if (options.bright === undefined) tone.connect(envelope);
        else {
            const shade = context.createBiquadFilter();
            shade.type = 'lowpass';
            shade.frequency.value = options.hz * (2 + options.bright * 8);
            tone.connect(shade);
            shade.connect(envelope);
        }
        source = tone;
    }
    source.start(at);
    source.stop(at + seconds + 0.01);

    return {
        cancel() {
            // A short release rather than an immediate stop: cutting a sounding
            // voice dead is itself a click, which is what cancelling is meant
            // to avoid.
            const now = context.currentTime;
            try {
                envelope.gain.cancelScheduledValues(now);
                envelope.gain.setValueAtTime(envelope.gain.value, now);
                envelope.gain.linearRampToValueAtTime(0, now + 0.01);
                source.stop(now + 0.02);
            } catch {
                // Already stopped, which is exactly the state we wanted.
            }
        },
    };
}

/**
 * Sound the scheduled cues, and vibrate where the device and the creator's
 * haptics setting allow. Silent unless cues are on: the setting is read here
 * rather than at each call site, so nothing can cue past it.
 */
export function enabled(event: CueEvent): boolean {
    const gate = gateOf(event);
    return get(
        gate === 'contact'
            ? contactCues
            : gate === 'animation'
              ? animationCues
              : cues,
    );
}

export default function sound(scheduled: ScheduledCue[]): void {
    // Filtered per cue rather than per batch: a reaction and a contact are
    // governed by different switches and can arrive together.
    const audible = scheduled.filter(({ event }) => enabled(event));
    if (audible.length === 0) return;
    const context = audio.outputContext();
    if (context === undefined || context.state !== 'running') return;

    let vibrated = false;
    for (const { event, offsetMs, strength } of audible) {
        const spec = Cues[event];
        const at = context.currentTime + offsetMs / 1000;
        // An event with a magnitude is quieter and higher the lighter it was.
        // That is what keeps several simultaneous cues from summing into one
        // louder cue: same sound at one pitch is a single thump, and a spread
        // of pitches is several things landing.
        const gain = spec.gain * (strength === undefined ? 1 : 0.35 + strength);
        const hz =
            spec.hz * (strength === undefined ? 1 : 1.6 - strength * 0.7);
        pulse(context, spec, { hz, at, gain, ms: spec.ms });
        if (spec.pulses === 2)
            pulse(context, spec, {
                hz: hz * spec.bend,
                at: at + Math.max(MinimumCueMs, spec.ms) / 1000 + 0.02,
                gain,
                ms: spec.ms,
            });
        // Reuses the beat's own guard, so a creator who turned vibration off
        // doesn't get it back through cues. Once per batch: vibration has no
        // polyphony, so four calls in an instant is one buzz.
        if (
            !vibrated &&
            spec.haptic > 0 &&
            get(haptics) &&
            supportsVibration()
        ) {
            navigator.vibrate(spec.haptic);
            vibrated = true;
        }
    }
}

/** A scheduled figure, which a cancel can take back before it finishes. */
export type FigureHandle = { cancel(): void };

const Silence: FigureHandle = { cancel() {} };

/**
 * Sound a whole animation's figure, scheduled ahead on the audio clock.
 *
 * Ahead rather than as it goes, because an animation is a Web Animation and
 * nothing re-enters the evaluator while it runs — a looping `Sequence` gives no
 * per-frame moment to hang a cue on. The cost is that a cancelled or paused
 * animation must be able to take back what it scheduled, which is what the
 * handle is for.
 */
export function soundFigure(figure: PoseCue[]): FigureHandle {
    // Independent of the evaluation switch: each row means what it says.
    if (figure.length === 0 || !get(animationCues)) return Silence;
    const context = audio.outputContext();
    if (context === undefined || context.state !== 'running') return Silence;

    const now = context.currentTime;
    const voices: Voice[] = [];
    for (const cue of figure) {
        const spec = Cues[cue.event];
        const at = now + cue.atMs / 1000;
        voices.push(
            pulse(context, spec, {
                hz: cue.hz,
                at,
                gain: cue.gain,
                ms: cue.ms,
                pan: cue.pan,
                bright: cue.bright,
            }),
        );
        if (cue.bend !== 1)
            voices.push(
                pulse(context, spec, {
                    hz: cue.hz * cue.bend,
                    at: at + Math.max(MinimumCueMs, cue.ms) / 1000 + 0.02,
                    gain: cue.gain,
                    ms: cue.ms,
                    pan: cue.pan,
                    bright: cue.bright,
                }),
            );
    }
    return {
        cancel() {
            for (const voice of voices) voice.cancel();
        },
    };
}
