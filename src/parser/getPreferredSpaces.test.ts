import Source from '@nodes/Source';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { describe, expect, test } from 'vitest';

/** Format `code` the way the tidy command does. */
function format(code: string): string {
    const source = new Source('test', code);
    return source
        .withSpaces(getPreferredSpaces(source.root, source.spaces))
        .getCode()
        .toString();
}

describe('short code stays on one line', () => {
    test('a short evaluate', () => {
        expect(format("Phrase('hi')")).toBe("Phrase('hi')");
    });

    test('a short list, set, and map', () => {
        expect(format('[1 2 3]')).toBe('[1 2 3]');
        expect(format('{1 2 3}')).toBe('{1 2 3}');
        expect(format("{'a': 1 'b': 2}")).toBe("{'a': 1 'b': 2}");
    });

    test('an empty list keeps its delimiters together', () => {
        expect(format('[]')).toBe('[]');
    });
});

describe('long code wraps onto one line per item', () => {
    test('an evaluate with many inputs', () => {
        // Previously impossible: Evaluate had no newline rule at all, so this
        // ran off the right edge no matter how long it got.
        expect(
            format(
                "Phrase('hello' size: 2m color: Color(50% 100 180°) place: Place(1m 2m 3m))",
            ),
        ).toBe(
            `Phrase(
\t'hello'
\tsize: 2m
\tcolor: Color(50% 100 180°)
\tplace: Place(1m 2m 3m)
)`,
        );
    });

    test('a long list', () => {
        expect(
            format(
                '[100 200 300 400 500 600 700 800 900 1000 1100 1200 1300 1400]',
            ),
        ).toBe(
            `[
\t100
\t200
\t300
\t400
\t500
\t600
\t700
\t800
\t900
\t1000
\t1100
\t1200
\t1300
\t1400
]`,
        );
    });

    test('a nested literal only breaks the container that does not fit', () => {
        // The outer evaluate exceeds the budget; the inner list still fits on its
        // own line once indented, so it stays whole.
        expect(
            format(
                "Phrase('a long enough phrase' place: Place(1m 2m) rest: [1 2 3])",
            ),
        ).toBe(
            `Phrase(
\t'a long enough phrase'
\tplace: Place(1m 2m)
\trest: [1 2 3]
)`,
        );
    });
});

describe('formatting is stable', () => {
    const samples = [
        "Phrase('hello' size: 2m color: Color(50% 100 180°) place: Place(1m 2m 3m))",
        '[100 200 300 400 500 600 700 800 900 1000 1100 1200 1300 1400]',
        "Phrase('hi')",
        'x: 1\nx + 2',
        "Phrase('a long enough phrase' place: Place(1m 2m) rest: [1 2 3])",
        '[[1 2 3] [4 5 6] [7 8 9] [10 11 12] [13 14 15] [16 17 18] [19 20]]',
    ];

    test('formatting twice changes nothing the second time', () => {
        // Wrapping decisions are made from the flat width, so a wrapped node must
        // not re-measure itself as "too long" and grow more breaks each pass.
        for (const sample of samples) {
            const once = format(sample);
            expect(format(once)).toBe(once);
        }
    });
});

describe('creator line breaks survive', () => {
    test('a hand-broken short list stays broken', () => {
        // Formatting only ever adds newlines; it never takes away a break the
        // creator typed, even when the content would fit on one line.
        expect(format('[1\n2]')).toBe('[\n\t1\n\t2\n]');
    });

    test('a break inside a nested call opens its containers', () => {
        // The inner call can't be on one line, so neither can the outer one.
        const result = format("Phrase('a'\nsize: 1m)");
        expect(result).toContain('\n');
        expect(format(result)).toBe(result);
    });
});

describe('the document start guard is literal', () => {
    test('leading blank lines before the program are removed', () => {
        expect(format("\n\nPhrase('hi')")).toBe("Phrase('hi')");
        expect(format("Phrase('hi')")).toBe("Phrase('hi')");
    });

    test('a program opening with docs keeps the newline after them', () => {
        // The first statement is only "at the document start" when nothing
        // precedes it. Pulling it up onto the doc's last line both mangles the
        // starter project and, since that line is already long, wraps the call.
        const starter = "¶A comment.\nA second line of it.¶\nPhrase('hi')";
        expect(format(starter)).toBe(starter);
    });

    test('a program opening with a borrow keeps the newline after it', () => {
        expect(format('↓ x\nx: 1\nx + 2')).toBe('↓ x\nx: 1\nx + 2');
    });
});
