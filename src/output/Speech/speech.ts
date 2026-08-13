/**
 * The app's single owner of `window.speechSynthesis`, in the same spirit as
 * `MusicAudio` owning the one `AudioContext`: two callers now want the voice —
 * `Say` on a stage and a `Track`'s spoken text — and `speechSynthesis.cancel()`
 * is global, so a second caller touching the API directly would silence the
 * first one's speech every time it changed.
 *
 * Everything that decides *what* is spoken lives in `speechQueue.ts` and
 * `voices.ts`, which are pure and tested. This file only applies effects and
 * feeds platform events back, so the two hard-to-test things — a browser API
 * and a policy — are never tangled together.
 *
 * Deliberately free of any `@db` import: this is reachable from the music
 * player, and modules on that path must not pull in `$env` (see CLAUDE.md).
 * The viewer's preferred voice is pushed in with `prefer` instead.
 */

import { writable, type Readable } from 'svelte/store';
import {
    cancelled,
    emptySpeech,
    finished,
    requested,
    type SpeechChange,
    type SpeechEffect,
    type SpeechState,
    type Utterance,
} from '@output/Speech/speechQueue';
import { chooseVoice, type VoiceOption } from '@output/Speech/voices';

/** The source id standalone `Say` outputs speak under. */
export const SaySource = 'say';

/** One source per music, so a track's line replaces that music's last line
 * without touching what any other music or a `Say` has pending. */
export function musicSource(music: string): string {
    return `music:${music}`;
}

/** What is being said right now, for anything that has to show or react to it. */
export type CurrentSpeech = { source: string; text: string };

const speaking = writable<CurrentSpeech | undefined>(undefined);

/**
 * Which source is audible, and the words it is speaking.
 *
 * The text is carried so a caption renders the utterance the platform was
 * actually handed, rather than deriving one from the `Say`s on stage. Those two
 * diverge in both directions — a stage whose says have emptied is still
 * speaking the tail of what it queued, and a paused stage still has says while
 * nothing is being said — and a caption that disagrees with the voice is worse
 * than no caption. Ducking only needs the source.
 */
export const speakingNow: Readable<CurrentSpeech | undefined> = {
    subscribe: speaking.subscribe,
};

/**
 * Chrome stops speaking part-way through anything longer than ~15 seconds
 * unless the synthesizer is nudged. Pausing and immediately resuming is the
 * long-standing workaround; it is cheap, and it is only possible to do in one
 * place now that one module owns the API.
 */
const KeepAliveInterval = 10000;

/**
 * Roughly how long text takes to say, used only when there is no engine to say
 * it. A device with no installed voices still has to advance its queue, or the
 * one utterance it accepted would hold the voice forever and a caption of it
 * would never clear. About 150 words a minute, floored so a one-word line is
 * still readable and capped so a runaway string can't wedge the queue either.
 */
const UnvoicedMsPerCharacter = 60;
const MinUnvoicedMs = 700;
const MaxUnvoicedMs = 20000;

function unvoicedDuration(text: string): number {
    return Math.min(
        MaxUnvoicedMs,
        Math.max(MinUnvoicedMs, text.length * UnvoicedMsPerCharacter),
    );
}

class Speech {
    private state: SpeechState = emptySpeech();
    /** `getVoices()` is empty until the engine has loaded them, so it is
     * cached and refreshed on `voiceschanged` rather than trusted once. */
    private available: VoiceOption[] | undefined = undefined;
    private listening = false;
    private keepAlive: ReturnType<typeof setInterval> | undefined = undefined;
    /** Stands in for `onend` when there is no engine to end anything. */
    private unvoiced: ReturnType<typeof setTimeout> | undefined = undefined;
    /** The viewer's pinned voiceURI, pushed in by the component that can read
     * settings. */
    private preferred: string | undefined = undefined;
    private primed = false;

    /** Whether this browser can speak at all. False under Node and JSDOM, so
     * every caller degrades to silence rather than throwing. */
    supported(): boolean {
        return typeof speechSynthesis !== 'undefined';
    }

    private synth(): SpeechSynthesis | undefined {
        return typeof speechSynthesis === 'undefined'
            ? undefined
            : speechSynthesis;
    }

    /** Remember the viewer's chosen voice. Applied per utterance, and only
     * when it speaks that utterance's language; see `chooseVoice`. */
    prefer(uri: string | undefined) {
        this.preferred = uri;
    }

    voices(): readonly VoiceOption[] {
        const synth = this.synth();
        if (synth === undefined) return [];
        if (!this.listening) {
            this.listening = true;
            synth.addEventListener('voiceschanged', () => {
                this.available = undefined;
            });
        }
        if (this.available === undefined)
            this.available = synth
                .getVoices()
                .map((voice) => ({ lang: voice.lang, uri: voice.voiceURI }));
        return this.available;
    }

    /**
     * Unlock synthesis from inside a user gesture, the way `MusicAudio`'s
     * gesture latch unlocks the audio context. iOS refuses to speak until it
     * has been asked to once during a real interaction, and a lyric arriving
     * on a beat is not one.
     */
    prime() {
        const synth = this.synth();
        if (synth === undefined || this.primed) return;
        this.primed = true;
        const silent = new SpeechSynthesisUtterance('');
        silent.volume = 0;
        synth.speak(silent);
    }

    /**
     * Speak these in order, replacing everything `source` had pending.
     *
     * Deliberately not gated on `supported()`: the queue runs on a device with
     * no engine too, so that captions — which render whatever this reports as
     * speaking — still appear for a viewer who cannot hear it anyway. A device
     * with no installed voices is exactly the case where a deaf viewer would
     * otherwise be left with nothing at all.
     */
    speak(source: string, utterances: readonly Utterance[]) {
        this.apply(requested(this.state, source, utterances));
    }

    /** Stop this source, whether it is speaking or merely waiting. */
    cancel(source: string) {
        this.apply(cancelled(this.state, source));
    }

    private apply(change: SpeechChange) {
        this.state = change.next;
        for (const effect of change.effects) this.perform(effect);
        const current = this.state.current;
        speaking.set(
            current === undefined
                ? undefined
                : {
                      source: current.utterance.source,
                      text: current.utterance.text,
                  },
        );
        this.pace();
    }

    private perform(effect: SpeechEffect) {
        const synth = this.synth();
        if (effect.kind === 'cancel') {
            this.clearUnvoiced();
            synth?.cancel();
            return;
        }

        const { id, utterance } = effect.speaking;

        // No engine: keep the queue moving on a timer, so a batch still advances
        // and still drains. Without this the one utterance it accepted would
        // hold the voice forever and a caption of it would never clear.
        if (synth === undefined) {
            this.clearUnvoiced();
            this.unvoiced = setTimeout(
                () => this.apply(finished(this.state, id)),
                unvoicedDuration(utterance.text),
            );
            return;
        }

        const spoken = new SpeechSynthesisUtterance(utterance.text);
        if (utterance.lang !== undefined) spoken.lang = utterance.lang;
        spoken.rate = utterance.rate;
        spoken.volume = utterance.volume;
        const voice = chooseVoice(
            this.voices(),
            this.preferred,
            utterance.lang,
        );
        if (voice !== undefined) {
            const match = synth
                .getVoices()
                .find((option) => option.voiceURI === voice.uri);
            if (match) spoken.voice = match;
        }
        // Errors end an utterance as surely as finishing does — a device with
        // no voices reports one immediately — so both release the queue, or a
        // single failure would hold the one slot forever.
        spoken.onend = () => this.apply(finished(this.state, id));
        spoken.onerror = () => this.apply(finished(this.state, id));
        synth.speak(spoken);
    }

    private clearUnvoiced() {
        if (this.unvoiced !== undefined) {
            clearTimeout(this.unvoiced);
            this.unvoiced = undefined;
        }
    }

    /** Run the keep-alive only while something is actually being spoken. */
    private pace() {
        const speaking = this.state.current !== undefined;
        if (speaking && this.keepAlive === undefined)
            this.keepAlive = setInterval(() => {
                const synth = this.synth();
                if (synth === undefined) return;
                synth.pause();
                synth.resume();
            }, KeepAliveInterval);
        else if (!speaking && this.keepAlive !== undefined) {
            clearInterval(this.keepAlive);
            this.keepAlive = undefined;
        }
    }
}

const speech = new Speech();
export default speech;
