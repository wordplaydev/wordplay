import { describe, expect, test } from 'vitest';
import {
    cancelled,
    clampRate,
    emptySpeech,
    finished,
    requested,
    type SpeechEffect,
    type SpeechPriority,
    type SpeechState,
    type Utterance,
} from '@output/Speech/speechQueue';

function say(
    source: string,
    text: string,
    priority: SpeechPriority = 'flow',
): Utterance {
    return { source, text, lang: undefined, rate: 1, volume: 1, priority };
}

/** The text of every utterance the platform was told to speak. */
function spoken(effects: readonly SpeechEffect[]): string[] {
    return effects.flatMap((effect) =>
        effect.kind === 'speak' ? [effect.speaking.utterance.text] : [],
    );
}

function cancels(effects: readonly SpeechEffect[]): number {
    return effects.filter((effect) => effect.kind === 'cancel').length;
}

/** The id the platform is currently speaking, for feeding back to `finished`. */
function currentId(state: SpeechState): number {
    const id = state.current?.id;
    expect(id).toBeDefined();
    return id ?? -1;
}

describe('one utterance at a time', () => {
    test('an idle queue speaks the first and holds the rest', () => {
        const { next, effects } = requested(emptySpeech(), 'say', [
            say('say', 'one'),
            say('say', 'two'),
        ]);
        // Only one goes to the platform; the second is ours to release, since
        // the platform's own queue cannot be cancelled per source.
        expect(spoken(effects)).toEqual(['one']);
        expect(next.waiting).toHaveLength(1);
    });

    test('finishing one releases the next', () => {
        const first = requested(emptySpeech(), 'say', [
            say('say', 'one'),
            say('say', 'two'),
        ]);
        const second = finished(first.next, currentId(first.next));
        expect(spoken(second.effects)).toEqual(['two']);
    });

    test('a batch keeps its order', () => {
        const { next } = requested(emptySpeech(), 'say', [
            say('say', 'one'),
            say('say', 'two'),
            say('say', 'three'),
        ]);
        expect(next.current?.utterance.text).toBe('one');
        expect(
            next.waiting.map((waiting) => waiting.utterance.text),
        ).toEqual(['two', 'three']);
    });
});

describe('sources', () => {
    test('new content from a source replaces what that source had pending', () => {
        const first = requested(emptySpeech(), 'say', [
            say('say', 'one'),
            say('say', 'two'),
        ]);
        const second = requested(first.next, 'say', [say('say', 'three')]);
        expect(cancels(second.effects)).toBe(1);
        expect(spoken(second.effects)).toEqual(['three']);
        expect(second.next.waiting).toHaveLength(0);
    });

    test('a different source queues rather than interrupting', () => {
        const first = requested(emptySpeech(), 'say', [say('say', 'one')]);
        const second = requested(first.next, 'music:a', [
            say('music:a', 'two'),
        ]);
        expect(cancels(second.effects)).toBe(0);
        expect(spoken(second.effects)).toEqual([]);
        expect(second.next.current?.utterance.text).toBe('one');
    });

    test('cancelling a source that is not speaking leaves the speaker alone', () => {
        const first = requested(emptySpeech(), 'say', [say('say', 'one')]);
        const second = requested(first.next, 'music:a', [
            say('music:a', 'two'),
        ]);
        const third = cancelled(second.next, 'music:a');
        expect(cancels(third.effects)).toBe(0);
        expect(third.next.current?.utterance.text).toBe('one');
        expect(third.next.waiting).toHaveLength(0);
    });

    test('cancelling the speaker starts whatever was waiting behind it', () => {
        const first = requested(emptySpeech(), 'say', [say('say', 'one')]);
        const second = requested(first.next, 'music:a', [
            say('music:a', 'two'),
        ]);
        const third = cancelled(second.next, 'say');
        expect(cancels(third.effects)).toBe(1);
        expect(spoken(third.effects)).toEqual(['two']);
    });
});

describe('deadlines', () => {
    test('a track line preempts a Say that is speaking', () => {
        const first = requested(emptySpeech(), 'say', [say('say', 'talking')]);
        const second = requested(first.next, 'music:a', [
            say('music:a', 'lyric', 'deadline'),
        ]);
        expect(cancels(second.effects)).toBe(1);
        expect(spoken(second.effects)).toEqual(['lyric']);
    });

    test('a Say queues behind a track line rather than cutting it', () => {
        const first = requested(emptySpeech(), 'music:a', [
            say('music:a', 'lyric', 'deadline'),
        ]);
        const second = requested(first.next, 'say', [say('say', 'talking')]);
        expect(cancels(second.effects)).toBe(0);
        expect(second.next.current?.utterance.text).toBe('lyric');
    });

    test('a track line cuts the track line before it', () => {
        const first = requested(emptySpeech(), 'music:a', [
            say('music:a', 'first', 'deadline'),
        ]);
        const second = requested(first.next, 'music:a', [
            say('music:a', 'second', 'deadline'),
        ]);
        expect(cancels(second.effects)).toBe(1);
        expect(spoken(second.effects)).toEqual(['second']);
    });

    test('several deadlines due at once keep only the newest', () => {
        // Two speaking tracks, or one tick that ran long: the older line is
        // already on a beat that has gone by, so it is dropped rather than
        // spoken somewhere it was never written.
        const first = requested(emptySpeech(), 'music:a', [
            say('music:a', 'older', 'deadline'),
        ]);
        const held = finished(first.next, currentId(first.next));
        const queued = requested(held.next, 'music:b', [
            say('music:b', 'newer', 'deadline'),
        ]);
        expect(spoken(queued.effects)).toEqual(['newer']);
        expect(queued.next.waiting).toHaveLength(0);
    });
});

describe('platform feedback', () => {
    test('an end for an utterance we already abandoned is ignored', () => {
        // cancel() fires onend for the utterance it killed, and that arrives
        // after the replacement has started. Acting on it would stop the
        // replacement a moment after starting it.
        const first = requested(emptySpeech(), 'say', [say('say', 'one')]);
        const stale = currentId(first.next);
        const second = requested(first.next, 'say', [say('say', 'two')]);
        const late = finished(second.next, stale);
        expect(late.effects).toEqual([]);
        expect(late.next.current?.utterance.text).toBe('two');
    });

    test('an end with nothing waiting leaves the queue idle', () => {
        const first = requested(emptySpeech(), 'say', [say('say', 'one')]);
        const second = finished(first.next, currentId(first.next));
        expect(second.next.current).toBeUndefined();
        expect(second.effects).toEqual([]);
    });
});

describe('what never reaches the platform', () => {
    test('blank text is dropped rather than queued', () => {
        const { next, effects } = requested(emptySpeech(), 'say', [
            say('say', '   '),
            say('say', 'real'),
        ]);
        expect(spoken(effects)).toEqual(['real']);
        expect(next.waiting).toHaveLength(0);
    });

    test('a silent utterance is dropped, since it would still be waited out', () => {
        const { effects } = requested(emptySpeech(), 'music:a', [
            { ...say('music:a', 'muted'), volume: 0 },
        ]);
        expect(effects).toEqual([]);
    });
});

describe('clampRate', () => {
    test('holds the API range and survives nonsense', () => {
        expect(clampRate(1)).toBe(1);
        expect(clampRate(0)).toBe(0.1);
        expect(clampRate(1000)).toBe(10);
        expect(clampRate(Number.NaN)).toBe(1);
        expect(clampRate(Number.POSITIVE_INFINITY)).toBe(1);
    });
});
