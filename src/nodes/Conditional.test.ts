import ExpectedBooleanCondition from '@conflicts/ExpectedBooleanCondition';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import { conflictsIn, testConflict } from '@conflicts/TestUtilities';
import { UnknownName } from '@conflicts/UnknownName';
import { expect, test } from 'vitest';
import type Conflict from '@conflicts/Conflict';
import evaluateCode from '@runtime/evaluate';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Conditional from '@nodes/Conditional';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';

test.each([
    ['⊥ ? 2 3"', '1 ? 2 3', Conditional, ExpectedBooleanCondition],
    [
        `
        a: 1 > 0 ? 1 "hi"
        a•# ? a + 1 a
        `,
        `
        a: 1 > 0 ? 1 "hi"
        ⊤ ? a + 1 a
        `,
        Reference,
        UnknownName,
        2,
    ],
    [
        `
        a: 1 > 0 ? 1 "hi"
        ((a•#) & (a > 1)) ? a + 1 a
        `,
        `
        a: 1 > 0 ? 1 "hi"
        ~((a•#) & (a > 1)) ? a + 1 a
        `,
        BinaryEvaluate,
        IncompatibleInput,
        3,
    ],
    [
        `
        •Cat(name•""|#)
        a: Cat(1)
        a.name•# ? a.name + 1 a
        `,
        `
        •Cat(name•""|#)
        a: Cat(1)
        a.name•"" ? a.name + 'hi' a
        `,
        BinaryEvaluate,
        IncompatibleInput,
        0,
    ],
    [
        `
        a•#|"": 1
        a•# ? a + 1 a
        `,
        `
        a•#|"": 1
        ~(a•#) ? a + 1 a
        `,
        BinaryEvaluate,
        IncompatibleInput,
    ],
    [
        `
        a•#|"": 1
        a•# ? a + 1 a`,
        `
        a•#|"": 1
        ~~(a•#) ? a a + 1
        `,
        BinaryEvaluate,
        IncompatibleInput,
    ],
    // A check held in a name guards just as the same check written inline does:
    // the condition is followed through the definitions it names. (#1285)
    [
        `
        a•#|"": 1
        ok: a•#
        ok ? a + 1 a
        `,
        `
        a•#|"": 1
        ok: a•""
        ok ? a + 1 a
        `,
        BinaryEvaluate,
        IncompatibleInput,
    ],
    // The false branch of a named check gets the complement, same as inline.
    [
        `
        a•#|"": 1
        ok: a•#
        ok ? a + 1 a
        `,
        `
        a•#|"": 1
        ok: a•#
        ok ? a a + 1
        `,
        BinaryEvaluate,
        IncompatibleInput,
    ],
    // Parenthesized, since a parenthetical is a Block, which doesn't itself
    // guard types — following the name has to reach through it.
    [
        `
        a•#|"": 1
        ok: (a•#) & (a ≠ "")
        ok ? a + 1 a
        `,
        `
        a•#|"": 1
        ok: (a•"") & (a ≠ 1)
        ok ? a + 1 a
        `,
        BinaryEvaluate,
        IncompatibleInput,
        2,
    ],
])(
    '%s => no conflict, %s => conflict',
    (
        good: string,
        bad: string,
        node: new (...params: never[]) => Node,
        conflict: new (...params: never[]) => Conflict,
        nodeIndex?: number,
        badIndex?: number | undefined,
    ) => {
        testConflict(good, bad, node, conflict, nodeIndex, badIndex);
    },
);

test('a name used as a subject is not a check', () => {
    // `game.phase = 2` names `game` as the thing being asked about, not as the
    // question. Following it would let any bind whose value happens to contain a
    // check somewhere guard everything — here narrowing `key` to text and pulling
    // its stream type out from under the `∆` that tests it. (#1285)
    expect(
        conflictsIn(`key: Key()
        tick: Time(150ms)
        •Game(phase•#)
        game•Game: Game(1)
            … (∆ tick | ∆ key) …
            (game.phase = 2)
                ? (∆ tick ? Game(1) (∆ key ? Game(2) game))
                (∆ tick ? game (∆ key ? ((key = 'Enter') ? Game(1) game) game))
        Phrase(game.phase → '')`),
    ).toEqual([]);
});

test(
    'a check held in a mutually recursive bind terminates',
    { timeout: 5000 },
    () => {
        // Binds that name each other are a conflict, not a parse error, so the
        // guard analysis still runs on them. `a` matches (its value checks `c`),
        // so BOTH recursions run: the search that follows names into bind values,
        // and the evaluation that expands them. Neither may loop. (#1285)
        expect(
            conflictsIn(`c•#|"": 1
        a: (c•#) & b
        b: a
        a ? c + 1 c`),
        ).toBeInstanceOf(Array);
    },
);

test('Test conditional logic', () => {
    expect(evaluateCode("1 < 5 ? 'yes' 'no'")?.toString()).toBe('"yes"');
    expect(evaluateCode("1 > 5 ? 'yes' 'no'")?.toString()).toBe('"no"');
    expect(evaluateCode("1 > 5 ? 'yes' 1 > 0 ? 'maybe' 'no'")?.toString()).toBe(
        '"maybe"',
    );
});
