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
    type SynthRecipe,
} from '@output/Music/synthesis';
import { articulate } from '@output/Music/articulate';
import {
    Breath,
    ChorusCents,
    VibratoDepth,
    VibratoOnset,
    VibratoRamp,
    VibratoRate,
    glottalHarmonics,
    tuneFirstFormant,
} from '@output/Music/voice';
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
    trackNode(
        index: number,
        pan: number,
        volume: number,
    ): AudioNode | undefined;
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
        if (
            typeof window === 'undefined' ||
            typeof AudioContext === 'undefined'
        )
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
        // The vocal synthesizer is a different shape of graph, not a different
        // oscillator in the same one — several sources into a filter bank
        // whose every parameter moves during the note — so it gets its own
        // builder rather than more branches in this one.
        if (recipe.source === 'voice')
            return this.playVocalNote(context, bus, note, recipe);

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
        const release =
            sampled !== undefined ? SampleRelease : envelope.release;

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

    /**
     * One note of the vocal synthesizer: a glottal source and a breath source
     * mixed together, passed through a parallel bank of four formant
     * bandpasses whose every frequency, width, and amplitude moves during the
     * note, and shaped by the same ADSR as any other synthesized voice.
     *
     * Every decision has already been made by the time we get here —
     * `articulate` returned a list of timed targets — so this only turns them
     * into `AudioParam` automation. That is why none of the phonetics is in
     * this file: automation is the only part that needs a browser.
     */
    private playVocalNote(
        context: AudioContext,
        bus: PlayerBus,
        note: ScheduledNote,
        recipe: SynthRecipe,
    ): PlayingVoice | undefined {
        const envelope = recipe.envelope;
        const track = bus.trackNode(note.trackIndex, note.pan, 1);
        if (track === undefined) return undefined;

        const start = Math.max(note.startTime, context.currentTime);
        const sung = Math.max(note.durationSeconds, 0.02);
        const end = start + sung;
        const fundamental = semitonesToFrequency(note.semitones);
        const segments = articulate(note.words, sung);

        const sources: AudioScheduledSourceNode[] = [];
        const mix = context.createGain();
        mix.gain.value = 1;

        // The glottal source: two oscillators a few cents apart, which is the
        // caricature made audible. Their detune is also where the vibrato
        // arrives, since an AudioParam sums its connections onto its value.
        const glottal = context.createGain();
        glottal.connect(mix);
        const wave = this.glottalWave(context);
        const vibrato = context.createOscillator();
        vibrato.frequency.value = VibratoRate;
        const depth = context.createGain();
        // A note that starts already wobbling sounds like a synthesizer
        // imitating vibrato, so the depth grows in after the onset.
        depth.gain.setValueAtTime(0, start);
        depth.gain.setValueAtTime(0, start + VibratoOnset);
        depth.gain.linearRampToValueAtTime(
            VibratoDepth,
            start + VibratoOnset + VibratoRamp,
        );
        vibrato.connect(depth);
        sources.push(vibrato);
        for (const cents of [ChorusCents, -ChorusCents]) {
            const oscillator = context.createOscillator();
            oscillator.setPeriodicWave(wave);
            oscillator.frequency.value = fundamental;
            oscillator.detune.value = cents;
            depth.connect(oscillator.detune);
            oscillator.connect(glottal);
            sources.push(oscillator);
        }

        // The breath source, which is both the whisper under a vowel and the
        // whole of a fricative. Looped, because a note can outlast the second
        // of noise everything else only needs a slice of.
        const breath = context.createGain();
        const noise = context.createBufferSource();
        noise.buffer = this.noiseBuffer(context);
        noise.loop = true;
        noise.connect(breath);
        breath.connect(mix);
        sources.push(noise);

        // The formant bank, in parallel so each formant has its own amplitude.
        const sum = context.createGain();
        sum.gain.value = 1;
        const bank = [0, 1, 2, 3].map(() => {
            const filter = context.createBiquadFilter();
            filter.type = 'bandpass';
            const amplitude = context.createGain();
            mix.connect(filter);
            filter.connect(amplitude);
            amplitude.connect(sum);
            return { filter, amplitude };
        });

        let tail: AudioNode = sum;
        // A nasal's antiformant. Built only when some segment needs one, since
        // most notes are vowels and this would otherwise be a node per voice
        // doing nothing.
        let zero: BiquadFilterNode | undefined = undefined;
        if (segments.some((segment) => segment.antiformant !== undefined)) {
            zero = context.createBiquadFilter();
            zero.type = 'notch';
            tail.connect(zero);
            tail = zero;
        }

        // A trill's beating, for the same reason built only when asked for.
        let flutter:
            | { oscillator: OscillatorNode; depth: GainNode; chop: GainNode }
            | undefined = undefined;
        if (segments.some((segment) => segment.flutter > 0)) {
            const oscillator = context.createOscillator();
            const flutterDepth = context.createGain();
            flutterDepth.gain.value = 0;
            const chop = context.createGain();
            chop.gain.value = 1;
            oscillator.connect(flutterDepth);
            flutterDepth.connect(chop.gain);
            sources.push(oscillator);
            tail.connect(chop);
            tail = chop;
            flutter = { oscillator, depth: flutterDepth, chop };
        }

        const gain = context.createGain();
        const level = recipe.gain * note.velocity;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(level, start + envelope.attack);
        gain.gain.linearRampToValueAtTime(
            level * envelope.sustain,
            start + envelope.attack + envelope.decay,
        );
        gain.gain.setValueAtTime(
            Math.max(level * envelope.sustain, 0.0001),
            Math.max(end, start + envelope.attack + envelope.decay),
        );
        gain.gain.linearRampToValueAtTime(0, end + envelope.release);
        tail.connect(gain);
        gain.connect(track);

        // Hold at the previous target until the segment begins, then travel.
        // Without the explicit hold, a linear ramp would start interpolating
        // from wherever the last one finished, so every formant would spend
        // the whole note sliding instead of arriving and staying.
        const reached = new Map<AudioParam, number>();
        const move = (
            param: AudioParam,
            to: number,
            at: number,
            over: number,
        ) => {
            const from = reached.get(param);
            if (from === undefined) param.setValueAtTime(to, at);
            else {
                param.setValueAtTime(from, at);
                param.linearRampToValueAtTime(to, at + over);
            }
            reached.set(param, to);
        };
        const audible = context.sampleRate / 2 - 100;

        for (const segment of segments) {
            const at = start + segment.at;
            segment.formants.forEach((formant, index) => {
                const shaped = bank[index];
                // Only F1 is tuned to the note, and only upward; see
                // `tuneFirstFormant` for why that is a singing technique
                // rather than a compromise.
                const hz = Math.min(
                    index === 0
                        ? tuneFirstFormant(formant.hz, fundamental)
                        : formant.hz,
                    audible,
                );
                move(shaped.filter.frequency, hz, at, segment.glide);
                move(shaped.filter.Q, hz / formant.bw, at, segment.glide);
                move(
                    shaped.amplitude.gain,
                    segment.gain * formant.gain,
                    at,
                    segment.ramp,
                );
            });
            // Voicing and breath are one crossfade: a voiced fricative is the
            // same tract with the folds still running under the noise.
            const voicing = segment.voiced ? 1 - segment.noise : 0;
            // Halved because there are two oscillators in the pair.
            move(glottal.gain, voicing / 2, at, segment.ramp);
            move(
                breath.gain,
                Math.max(segment.noise, segment.voiced ? Breath : 0),
                at,
                segment.ramp,
            );
            if (zero !== undefined) {
                // Parked narrow and above hearing when unused: a notch is
                // *wider* as its Q falls, so an idle one must be high-Q or it
                // takes the whole spectrum with it.
                move(
                    zero.frequency,
                    segment.antiformant?.hz ?? 19000,
                    at,
                    segment.glide,
                );
                move(
                    zero.Q,
                    segment.antiformant === undefined
                        ? 30
                        : segment.antiformant.hz / segment.antiformant.bw,
                    at,
                    segment.glide,
                );
            }
            if (flutter !== undefined) {
                const beating = segment.flutter > 0;
                move(
                    flutter.oscillator.frequency,
                    Math.max(segment.flutter, 1),
                    at,
                    segment.ramp,
                );
                move(flutter.depth.gain, beating ? 0.4 : 0, at, segment.ramp);
                move(flutter.chop.gain, beating ? 0.6 : 1, at, segment.ramp);
            }
        }

        const stopAt = end + envelope.release + 0.01;
        for (const source of sources) {
            source.start(start);
            source.stop(stopAt);
        }

        let stopped = false;
        return {
            endsAt: end + envelope.release,
            cancel: () => {
                if (stopped) return;
                stopped = true;
                const now = context.currentTime;
                gain.gain.cancelScheduledValues(now);
                // The same trap as the sampled path: cancelling removes the
                // `setValueAtTime(0, start)` holding a not-yet-started note
                // down, and an unassigned GainNode reads 1.
                gain.gain.setValueAtTime(
                    start > now ? 0 : gain.gain.value,
                    now,
                );
                gain.gain.linearRampToValueAtTime(0, now + CancelRamp);
                for (const source of sources)
                    try {
                        source.stop(now + CancelRamp + 0.005);
                    } catch {
                        // Already stopped.
                    }
            },
        };
    }

    private glottal: PeriodicWave | undefined = undefined;

    /** The glottal pulse, built once and shared: a `PeriodicWave` is immutable
     * and every voice wants the same one. */
    private glottalWave(context: AudioContext): PeriodicWave {
        if (this.glottal !== undefined) return this.glottal;
        const { real, imag } = glottalHarmonics();
        this.glottal = context.createPeriodicWave(real, imag);
        return this.glottal;
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
