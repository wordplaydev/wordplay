import DefaultLocales from '@locale/DefaultLocales';
import evaluateCode from '@runtime/evaluate';
import ListValue from '@values/ListValue';
import type Value from '@values/Value';
import { describe, expect, test } from 'vitest';
import describeValueChange, {
    renderValueForSpeech,
    type ValueChange,
} from './describeChange';

/**
 * Evaluate a two-element list and return its members as a before/after pair.
 * Building them separately means the identity fast path can't mask a bug.
 */
function pair(code: string): [Value, Value] {
    const value = evaluateCode(code);
    if (!(value instanceof ListValue) || value.values.length !== 2)
        throw new Error(`Expected a two-element list from ${code}`);
    return [value.values[0], value.values[1]];
}

/** What a screen reader would be told changed between the two. */
function change(code: string, after?: string): ValueChange | undefined {
    const [before, now] = pair(code);
    return describeValueChange(DefaultLocales, before, now, after);
}

function described(code: string, after?: string): string | undefined {
    return change(code, after)?.description;
}

test('names the property that changed and its new value', () => {
    expect(described('•P(x•# y•#)\n[P(1 2) P(1 3)]')).toBe('y 3');
});

test('says nothing when nothing changed', () => {
    expect(described('•P(x•# y•#)\n[P(1 2) P(1 2)]')).toBeUndefined();
});

test('speaks booleans as words, not symbols', () => {
    // ⊤ and ⊥ are read aloud as glyph names or skipped entirely.
    expect(described('•F(open•?)\n[F(⊥) F(⊤)]')).toBe('open true');
    expect(described('•F(open•?)\n[F(⊤) F(⊥)]')).toBe('open false');
});

test('recurses to name the leaf that changed', () => {
    expect(
        described('•P(x•# y•#)\n•Q(p•P)\n[Q(P(1 2)) Q(P(1.2 2))]'),
    ).toBe('p x 1.2');
});

test('stays silent for a change too small to hear', () => {
    // Rounding to tenths is the point: 0.04 changes nothing a listener can use.
    expect(described('•P(x•#)\n[P(1.00) P(1.04)]')).toBeUndefined();
    // Crossing a tenth is worth saying.
    expect(described('•P(x•#)\n[P(1.00) P(1.06)]')).toBe('x 1.1');
});

test('keeps units on numbers', () => {
    expect(described('•P(x•#m)\n[P(1m) P(2m)]')).toBe('x 2m');
});

describe('round-robin', () => {
    /** Two properties change every time; feeding the last name back must
     *  advance rather than repeat, or a busy early property would be the only
     *  thing ever heard. */
    test('advances past the property announced last time', () => {
        const code = '•P(a•# b•#)\n[P(1 1) P(2 2)]';
        const first = change(code);
        expect(first?.description).toBe('a 2');
        const second = change(code, first?.name);
        expect(second?.description).toBe('b 2');
        // …and wraps back around.
        const third = change(code, second?.name);
        expect(third?.description).toBe('a 2');
    });

    /**
     * The failure this exists to prevent, in the shape of a real `Face()`
     * result: `place` is declared first and moves every frame, so scanning
     * from the top would announce it forever and never reach `eyesOpen`.
     */
    test('reaches a later property even when the first changes constantly', () => {
        const code =
            '•Pl(x•# y•#)\n•E(place•Pl eyesOpen•? smiling•?)\n' +
            '[E(Pl(1 1) ⊥ ⊥) E(Pl(9 9) ⊤ ⊤)]';
        const heard: string[] = [];
        let last: string | undefined = undefined;
        for (let tick = 0; tick < 3; tick++) {
            const next = change(code, last);
            if (next === undefined) break;
            heard.push(next.description);
            last = next.name;
        }
        expect(heard[0]).toBe('place x 9');
        expect(heard).toContain('eyesOpen true');
        expect(heard).toContain('smiling true');
    });
});

describe('collections', () => {
    test('names the 1-based index of a changed element', () => {
        expect(described('[[1 2 3] [1 5 3]]')).toBe('2 5');
    });

    test('reports the first added element', () => {
        expect(described('[[1 2] [1 2 3]]')).toBe('3 3');
    });

    test('says nothing when a list is unchanged', () => {
        expect(described('[[1 2] [1 2]]')).toBeUndefined();
    });

    test('names the key whose value changed in a map', () => {
        expect(described("[{'a':1 'b':2} {'a':1 'b':3}]")).toBe('b 3');
    });

    test('reports a new map key with its value', () => {
        expect(described("[{'a':1} {'a':1 'b':2}]")).toBe('b 2');
    });

    test('reports what was added to a set', () => {
        expect(described('[{1 2} {1 2 3}]')).toBe('3');
    });

    test('ignores set reordering', () => {
        expect(described('[{1 2} {2 1}]')).toBeUndefined();
    });
});

describe('renderValueForSpeech', () => {
    test('rounds to tenths so precision no one can hear is not spoken', () => {
        expect(renderValueForSpeech(DefaultLocales, evaluate('1 ÷ 3'))).toBe(
            '0.3',
        );
    });

    test('leaves whole numbers whole', () => {
        expect(renderValueForSpeech(DefaultLocales, evaluate('5'))).toBe('5');
    });

    test('keeps the unit', () => {
        expect(renderValueForSpeech(DefaultLocales, evaluate('5.55m'))).toBe(
            '5.6m',
        );
    });

    test('words the boolean and none symbols', () => {
        expect(renderValueForSpeech(DefaultLocales, evaluate('⊤'))).toBe('true');
        expect(renderValueForSpeech(DefaultLocales, evaluate('ø'))).toBe('none');
    });

    test('names a structure by its type, never by its symbol', () => {
        // A type named 📍 must not be announced as an emoji.
        expect(
            renderValueForSpeech(DefaultLocales, evaluate('•P(x•#)\nP(1)')),
        ).toBe('P');
    });
});

function evaluate(code: string): Value {
    const value = evaluateCode(code);
    if (value === undefined) throw new Error(`No value from ${code}`);
    return value;
}
