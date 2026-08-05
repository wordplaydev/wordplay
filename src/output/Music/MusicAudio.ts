/**
 * The Web Audio shell: the one output AudioContext, the node graph, and the
 * gesture latch that resumes it. Everything here is impure and untestable
 * under Node; the policy it serves lives in the pure modules beside it, and
 * `MusicPlayer` talks to this through the `MusicAudioLike` interface so tests
 * can substitute a recorder.
 *
 * There is exactly one context for all output, module-level rather than
 * per-evaluator: browsers cap concurrent AudioContexts (~6 in Chrome), and
 * docs pages can host many evaluators at once. It is created lazily and
 * never closed — create/close churn is what that cap punishes.
 */

import { writable, type Writable } from 'svelte/store';
import type { ScheduledNote } from '@output/Music/schedule';
import {
    isPitched,
    kitIndex,
    kitSemitones,
    recipeFor,
} from '@output/Music/synthesis';
import { semitonesToFrequency } from '@output/Music/degrees';
import samples, { setDecodeContext } from '@output/Music/InstrumentSamples';

/** A note that has been handed to the audio graph. */
export type PlayingVoice = {
    /**
     * The audio-clock time this note stops being audible, release included.
     *
     * The audio layer is the only thing that knows it — the release tail
     * depends on the instrument — and the player has to, or it cannot tell a
     * note that has ended from one that merely started. Guessing that wrong is
     * what silenced every sound effect in the gallery a frame after it began.
     */
    endsAt: number;
    /** Silence it now, over a click-free ramp. */
    cancel(): void;
};

/** A per-player mixing bus: track nodes connect here, this connects to master. */
export type PlayerBus = {
    /** Pan and gain for one track index, created on demand. Undefined where
     * there is no audio layer (Node, JSDOM), so callers bail rather than
     * connecting to a node that doesn't exist. */
    trackNode(index: number, pan: number, volume: number): AudioNode | undefined;
    dispose(): void;
};

/** What MusicPlayer needs from the audio layer; a fake implements this. */
export type MusicAudioLike = {
    now(): number;
    createBus(): PlayerBus;
    playNote(bus: PlayerBus, note: ScheduledNote): PlayingVoice | undefined;
    /** Pull the master gain down to `depth` (0-1), or restore it. */
    setDucked(ducked: boolean, depth: number): void;
    /** True when the context is suspended and nothing will be heard. */
    isSuspended(): boolean;
    resume(): Promise<void>;
};

/** True while an output AudioContext exists but is suspended, so a stage with
 * music can offer a "tap for sound" affordance. */
export const musicSuspended: Writable<boolean> = writable(false);

/** Seconds to duck down, and to come back up. Asymmetric on purpose: duck
 * fast enough not to talk over a screen reader, restore gently. */
const DuckDown = 0.08;
const DuckUp = 0.2;
/** A short ramp to silence, so cancelling never clicks. */
const CancelRamp = 0.01;
/**
 * Playback level for sampled zones. The build normalizes every zone to one
 * loudness, so this single number sets where the whole sampled palette sits —
 * and it is matched to the synthesis recipes' level, since an instrument that
 * jumped in volume the moment its recording finished loading would be worse
 * than either alone.
 */
const SampleGain = 0.42;
/** Tail fade for a sampled note, matching the build's own release fade so a
 * note cut short sounds like the recording ending rather than a click. */
const SampleRelease = 0.06;

class MusicAudio implements MusicAudioLike {
    private context: AudioContext | undefined = undefined;
    private master: GainNode | undefined = undefined;
    private analyser: AnalyserNode | undefined = undefined;
    private spectrum: Uint8Array<ArrayBuffer> | undefined = undefined;
    private latched = false;

    /** Create the context and master chain on first use. Returns undefined
     * where Web Audio doesn't exist (Node, JSDOM). */
    private ensure(): AudioContext | undefined {
        if (this.context !== undefined) return this.context;
        if (typeof window === 'undefined' || typeof AudioContext === 'undefined')
            return undefined;
        const context = new AudioContext();
        const master = context.createGain();
        master.gain.value = 1;
        // The limiter is the runtime backstop the static safety analysis
        // can't provide: summed tracks can never clip or spike, whatever
        // volume says.
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.knee.value = 6;
        limiter.ratio.value = 12;
        limiter.attack.value = 0.003;
        limiter.release.value = 0.25;
        // A tap for the visualizations, before the limiter so it sees what
        // the music is doing rather than what the limiter left of it. An
        // AnalyserNode is one of the more expensive nodes in the API, so
        // there is exactly one, on the master bus.
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        // Heavily smoothed: the spectrum is decoration, and a jittery one
        // reads as flicker.
        analyser.smoothingTimeConstant = 0.86;
        master.connect(analyser);
        master.connect(limiter);
        limiter.connect(context.destination);
        this.analyser = analyser;
        this.spectrum = new Uint8Array(
            new ArrayBuffer(analyser.frequencyBinCount),
        );
        this.context = context;
        this.master = master;
        // The sample loader decodes into this context rather than making one
        // of its own, since browsers cap how many can exist.
        setDecodeContext(context);
        this.installGestureLatch();
        this.reportSuspended();
        return context;
    }

    /**
     * The current spectrum, 0-255 per bin, low frequencies first — or
     * undefined before any audio exists. The array is reused between calls,
     * since this is read every frame.
     */
    getSpectrum(): Uint8Array<ArrayBuffer> | undefined {
        if (this.analyser === undefined || this.spectrum === undefined)
            return undefined;
        this.analyser.getByteFrequencyData(this.spectrum);
        return this.spectrum;
    }

    private reportSuspended() {
        musicSuspended.set(this.context?.state === 'suspended');
    }

    /**
     * Resume on the first user gesture anywhere in the app. Evaluators start
     * without a gesture (ProjectView starts on mount), so a context created
     * for a playing stage is usually suspended; this catches the next click
     * or key, and the explicit affordance covers the case where none comes.
     */
    private installGestureLatch() {
        if (this.latched || typeof window === 'undefined') return;
        this.latched = true;
        const resume = () => {
            void this.resume();
        };
        window.addEventListener('pointerdown', resume, { capture: true });
        window.addEventListener('keydown', resume, { capture: true });
    }

    now(): number {
        return this.ensure()?.currentTime ?? 0;
    }

    isSuspended(): boolean {
        return this.context === undefined || this.context.state === 'suspended';
    }

    async resume(): Promise<void> {
        const context = this.ensure();
        if (context === undefined || context.state !== 'suspended') return;
        try {
            await context.resume();
        } catch {
            // A resume outside a gesture rejects; the affordance remains.
        }
        this.reportSuspended();
    }

    createBus(): PlayerBus {
        const context = this.ensure();
        if (context === undefined || this.master === undefined)
            return silentBus();
        const input = context.createGain();
        input.connect(this.master);
        const tracks = new Map<
            number,
            { gain: GainNode; panner: StereoPannerNode }
        >();
        return {
            trackNode(
                index: number,
                pan: number,
                volume: number,
            ): AudioNode | undefined {
                let nodes = tracks.get(index);
                if (nodes === undefined) {
                    const gain = context.createGain();
                    // Stereo only: StereoPannerNode is stateless vector math,
                    // where PannerNode with HRTF is one of the two genuinely
                    // expensive nodes in the API.
                    const panner = context.createStereoPanner();
                    gain.connect(panner);
                    panner.connect(input);
                    nodes = { gain, panner };
                    tracks.set(index, nodes);
                }
                // Re-read every note, so a spliced pan or volume takes effect.
                nodes.panner.pan.value = pan;
                nodes.gain.gain.value = volume;
                return nodes.gain;
            },
            dispose() {
                for (const { gain, panner } of tracks.values()) {
                    gain.disconnect();
                    panner.disconnect();
                }
                tracks.clear();
                input.disconnect();
            },
        };
    }

    playNote(bus: PlayerBus, note: ScheduledNote): PlayingVoice | undefined {
        const context = this.ensure();
        if (context === undefined) return undefined;

        const recipe = recipeFor(note.instrument);
        const envelope = recipe.envelope;
        // Never schedule in the past; the audio clock may have advanced past
        // a note decided at the start of this window.
        const start = Math.max(note.startTime, context.currentTime);
        const end = start + Math.max(note.durationSeconds, 0.02);

        const pitched = isPitched(note.instrument);
        // Unpitched instruments index their kit rather than transposing.
        const semitones = pitched
            ? note.semitones
            : kitSemitones(note.instrument, note.degree);

        // A real recording if this instrument has one. The player doesn't
        // start a piece until its sampled instruments are ready, so reaching
        // the synthesized branch below now means one of two things: an
        // instrument that is a synthesizer and has no recordings, or one whose
        // recordings failed to load, where synthesis beats silence.
        const sampled = pitched
            ? samples.zoneFor(note.instrument, semitones)
            : samples.kitZoneFor(
                  note.instrument,
                  kitIndex(note.instrument, note.degree),
              );
        let source: AudioScheduledSourceNode;
        if (sampled !== undefined) {
            const buffer = context.createBufferSource();
            buffer.buffer = sampled.buffer;
            // A pitched zone shifts to the note being played and then corrects
            // for however far the recording sits from concert pitch; a kit
            // piece is played exactly as recorded.
            buffer.detune.value = pitched
                ? (semitones + 60 - sampled.zone.root) * 100 +
                  sampled.zone.detune
                : 0;
            source = buffer;
        } else if (recipe.source === 'noise') {
            const buffer = context.createBufferSource();
            buffer.buffer = this.noiseBuffer(context);
            // Resample the noise so kit pieces differ audibly.
            buffer.playbackRate.value = Math.pow(2, semitones / 12);
            source = buffer;
        } else {
            const oscillator = context.createOscillator();
            oscillator.type = recipe.source;
            oscillator.frequency.value = semitonesToFrequency(semitones);
            source = oscillator;
        }

        // A recording already carries the instrument's own attack and decay,
        // so shaping it with the synth's envelope would blunt the very
        // transient we sampled it for. Zones only get their tail shaped, at
        // the level the build normalized them to; the recipe's envelope and
        // per-timbre gain apply to synthesized notes alone.
        const peak = sampled !== undefined ? SampleGain : recipe.gain;
        const attack = sampled !== undefined ? 0.002 : envelope.attack;
        const decay = sampled !== undefined ? 0 : envelope.decay;
        const sustain = sampled !== undefined ? 1 : envelope.sustain;
        const release = sampled !== undefined ? SampleRelease : envelope.release;

        const gain = context.createGain();
        const level = peak * note.velocity;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(level, start + attack);
        gain.gain.linearRampToValueAtTime(
            level * sustain,
            start + attack + decay,
        );
        gain.gain.setValueAtTime(
            Math.max(level * sustain, 0.0001),
            Math.max(end, start + attack + decay),
        );
        gain.gain.linearRampToValueAtTime(0, end + release);

        let tail: AudioNode = gain;
        // The low-pass shapes an oscillator into something instrument-like; a
        // recording is already the instrument, so filtering it just dulls it.
        if (recipe.cutoff !== undefined && sampled === undefined) {
            const filter = context.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = recipe.cutoff;
            gain.connect(filter);
            tail = filter;
        }
        const track = bus.trackNode(note.trackIndex, note.pan, 1);
        if (track === undefined) return undefined;
        source.connect(gain);
        tail.connect(track);

        source.start(start);
        source.stop(end + release + 0.01);

        let stopped = false;
        return {
            endsAt: end + release,
            cancel: () => {
                if (stopped) return;
                stopped = true;
                const at = context.currentTime;
                gain.gain.cancelScheduledValues(at);
                // Cancelling removes the whole envelope, including the
                // `setValueAtTime(0, start)` that was the only thing holding a
                // not-yet-started voice down — and an unassigned GainNode reads
                // 1, not this note's level. Ramping from there would make a
                // cancelled note louder than the music it interrupted. Pausing
                // cancels a whole lookahead window at once, so this is the
                // common case now rather than a corner of replay.
                gain.gain.setValueAtTime(start > at ? 0 : gain.gain.value, at);
                gain.gain.linearRampToValueAtTime(0, at + CancelRamp);
                try {
                    source.stop(at + CancelRamp + 0.005);
                } catch {
                    // Already stopped.
                }
            },
        };
    }

    private noise: AudioBuffer | undefined = undefined;

    /** One second of white noise, shared by every percussive voice. */
    private noiseBuffer(context: AudioContext): AudioBuffer {
        if (this.noise !== undefined) return this.noise;
        const buffer = context.createBuffer(
            1,
            context.sampleRate,
            context.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let index = 0; index < data.length; index++)
            data[index] = Math.random() * 2 - 1;
        this.noise = buffer;
        return buffer;
    }

    setDucked(ducked: boolean, depth: number) {
        const context = this.context;
        const master = this.master;
        if (context === undefined || master === undefined) return;
        const now = context.currentTime;
        const target = ducked ? Math.min(1, Math.max(0, depth)) : 1;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(
            target,
            now + (ducked ? DuckDown : DuckUp),
        );
    }
}

/** A bus that swallows everything, for environments with no Web Audio. */
function silentBus(): PlayerBus {
    return {
        trackNode: () => undefined,
        dispose: () => undefined,
    };
}

const audio = new MusicAudio();

/** The app's single output audio layer. */
export default audio;
