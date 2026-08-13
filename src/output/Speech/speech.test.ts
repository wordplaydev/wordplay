import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { get } from 'svelte/store';

/** A recording stand-in for the platform synthesizer. */
class FakeUtterance {
    text: string;
    lang = '';
    rate = 1;
    volume = 1;
    voice: unknown = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
        this.text = text;
    }
}

class FakeSynth {
    spoken: FakeUtterance[] = [];
    cancels = 0;
    speak(utterance: FakeUtterance) {
        this.spoken.push(utterance);
    }
    cancel() {
        this.cancels++;
    }
    pause() {}
    resume() {}
    getVoices() {
        return [];
    }
    addEventListener() {}
}

let synth: FakeSynth;
/** Imported fresh per test, since the bus is a module singleton with state. */
let speech: typeof import('@output/Speech/speech').default;
let SaySource: string;
let speakingNow: typeof import('@output/Speech/speech').speakingNow;

beforeEach(async () => {
    synth = new FakeSynth();
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    vi.resetModules();
    const module = await import('@output/Speech/speech');
    speech = module.default;
    SaySource = module.SaySource;
    speakingNow = module.speakingNow;
});

afterEach(() => vi.unstubAllGlobals());

function utterance(text: string) {
    return {
        source: SaySource,
        text,
        lang: 'en',
        rate: 1,
        volume: 1,
        priority: 'flow' as const,
    };
}

describe('the shell actually reaches the platform', () => {
    test('a single Say is handed to the synthesizer', () => {
        speech.speak(SaySource, [utterance('hi')]);
        expect(synth.spoken.map((u) => u.text)).toEqual(['hi']);
    });

    test('the utterance carries its language and rate', () => {
        speech.speak(SaySource, [{ ...utterance('hi'), rate: 1.5 }]);
        expect(synth.spoken[0].lang).toBe('en');
        expect(synth.spoken[0].rate).toBe(1.5);
    });

    test('speakingNow reports the source and the words', () => {
        speech.speak(SaySource, [utterance('one'), utterance('two')]);
        expect(get(speakingNow)).toEqual({ source: SaySource, text: 'one' });
    });

    test('speakingNow follows a batch to the next utterance', () => {
        // The caption renders this, so it has to track the voice line by line
        // rather than reporting the batch it was handed.
        speech.speak(SaySource, [utterance('one'), utterance('two')]);
        synth.spoken[0].onend?.();
        expect(get(speakingNow)).toEqual({ source: SaySource, text: 'two' });
    });

    test('finishing one speaks the next', () => {
        speech.speak(SaySource, [utterance('one'), utterance('two')]);
        synth.spoken[0].onend?.();
        expect(synth.spoken.map((u) => u.text)).toEqual(['one', 'two']);
    });

    test('an error releases the queue rather than holding the one slot', () => {
        speech.speak(SaySource, [utterance('one'), utterance('two')]);
        synth.spoken[0].onerror?.();
        expect(synth.spoken.map((u) => u.text)).toEqual(['one', 'two']);
    });

    test('cancelling a source stops it and clears speakingNow', () => {
        speech.speak(SaySource, [utterance('hi')]);
        speech.cancel(SaySource);
        expect(synth.cancels).toBe(1);
        expect(get(speakingNow)).toBeUndefined();
    });

    test('speaking again after everything finished still reaches the platform', () => {
        speech.speak(SaySource, [utterance('one')]);
        synth.spoken[0].onend?.();
        speech.speak(SaySource, [utterance('two')]);
        expect(synth.spoken.map((u) => u.text)).toEqual(['one', 'two']);
    });

    test('with no engine the queue still advances and drains', async () => {
        // The captions case: a device with no speechSynthesis says nothing, but
        // a deaf viewer still needs to see what was said, and the caption
        // renders whatever the queue reports speaking. If the queue stalled
        // here, the first line would hold the voice forever.
        vi.useFakeTimers();
        vi.stubGlobal('speechSynthesis', undefined);
        vi.resetModules();
        const module = await import('@output/Speech/speech');

        module.default.speak(module.SaySource, [
            utterance('one'),
            utterance('two'),
        ]);
        expect(get(module.speakingNow)?.text).toBe('one');

        // One utterance's worth at a time: a single long advance would fire the
        // second line's timer too and skip straight to silence.
        vi.advanceTimersByTime(1000);
        expect(get(module.speakingNow)?.text).toBe('two');

        vi.advanceTimersByTime(1000);
        expect(get(module.speakingNow)).toBeUndefined();
        vi.useRealTimers();
    });

    test('a cancel while idle does not wedge the next utterance', () => {
        // The paused-stage path: OutputView cancels on every non-playing
        // evaluation, long before anything has been said.
        speech.cancel(SaySource);
        speech.speak(SaySource, [utterance('hi')]);
        expect(synth.spoken.map((u) => u.text)).toEqual(['hi']);
    });
});
