import Caret from '@edit/caret/Caret';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

/**
 * Inline caret movement in text mode, which had no coverage at all — which is
 * how a mistaken bug report about it went unchecked. Arrowing along a line
 * deliberately **alternates** between text positions and node selections: at a
 * token's boundary the token itself is chosen, so a creator traversing code
 * meets each token as a whole before walking through its characters
 * (`Caret.moveInlineText`, which says so in its own comments).
 *
 * That alternation is easy to mistake for a defect from outside the model,
 * because a node selection has no single character offset — the editor's hidden
 * mirror reports its *start*, so a step onto a node reads as a jump backwards
 * and the step off it reads as a jump forwards. That is what a bug report about
 * this once was: an artifact of the instrument, not of the caret.
 *
 * The trap is worth naming, because writing these tests fell into it a second
 * time: monotonicity is NOT a property here, under any projection of a caret
 * onto a single number. What holds is that a walk visits each state once and
 * terminates, which is what "doesn't oscillate" actually means.
 */

/** A caret at a text position in the given code. */
function at(code: string, position: number) {
    return new Caret(new Source('test', code), position, undefined, undefined);
}

/** Where a caret sits: a number for a text position, or the selected node's
 *  own text, so a sequence reads the way a creator experiences it. */
function where(caret: Caret): number | string {
    const position = caret.position;
    if (typeof position === 'number') return position;
    if (Array.isArray(position)) return position[1];
    return position.toWordplay();
}

/** Walk `steps` inline moves from the end of `code`, reporting each landing. */
function walkBack(code: string, steps: number): (number | string)[] {
    let caret = at(code, new Source('test', code).getCode().getLength());
    const landings: (number | string)[] = [];
    for (let step = 0; step < steps; step++) {
        caret = caret.moveInlineText(false, -1);
        landings.push(where(caret));
    }
    return landings;
}

describe('inline movement alternates with node selection', () => {
    test('a token is chosen at its boundary, then walked through', () => {
        // greet: 'hello'
        // 0123456789...
        expect(walkBack("greet: 'hello'", 9)).toEqual([
            "'", // the closing quote, chosen as a node
            13, // then the position before it
            'hello', // the words token, chosen as a node
            12, // then its last character boundary...
            11,
            10,
            9,
            8, // ...down to its start
            "'", // and on to the opening quote
        ]);
    });

    test('a Japanese literal behaves exactly the same', () => {
        // The equivalence is the point: nothing about this depends on the
        // script, so a sequence that looks strange in Japanese looks equally
        // strange in English and is neither a bug nor script-specific.
        expect(walkBack("挨拶: 'こんにちは'", 9)).toEqual([
            "'",
            10,
            'こんにちは',
            9,
            8,
            7,
            6,
            5,
            "'",
        ]);
    });
});

describe('a run of inline moves terminates without cycling', () => {
    /* "Never moves backwards" is NOT a property of this design, and trying to
       assert it here reproduced the original mistake exactly: a node selection
       has no single offset, so projecting one onto a number makes the step onto
       a token and the step off it look like a reversal. What actually holds is
       that the walk never revisits a state and comes to rest at the end. */

    /** A caret's whole state, so a repeat means a genuine cycle rather than two
     *  different carets that happen to share an offset. */
    const state = (caret: Caret): string => {
        const position = caret.position;
        if (typeof position === 'number') return `at ${position}`;
        if (Array.isArray(position)) return `range ${position.join('-')}`;
        return `node ${position.id}`;
    };

    test.each([
        ["greet: 'hello'"],
        ["挨拶: 'こんにちは'"],
        ['a: 1 + 2'],
        ["名前: 'あ' + 'い'"],
    ])('walking back through %j reaches the start', (code) => {
        let caret = at(code, new Source('test', code).getCode().getLength());
        const seen = new Set<string>([state(caret)]);
        for (let step = 0; step < 60; step++) {
            caret = caret.moveInlineText(false, -1);
            if (caret.position === 0) return;
            const now = state(caret);
            expect(seen.has(now), `revisited ${now}`).toBe(false);
            seen.add(now);
        }
        throw new Error('never reached the start of the source');
    });

    test.each([["greet: 'hello'"], ["挨拶: 'こんにちは'"]])(
        'walking forward through %j reaches the end',
        (code) => {
            const end = new Source('test', code).getCode().getLength();
            let caret = at(code, 0);
            const seen = new Set<string>([state(caret)]);
            for (let step = 0; step < 60; step++) {
                caret = caret.moveInlineText(false, 1);
                if (caret.position === end) return;
                const now = state(caret);
                expect(seen.has(now), `revisited ${now}`).toBe(false);
                seen.add(now);
            }
            throw new Error('never reached the end of the source');
        },
    );
});
