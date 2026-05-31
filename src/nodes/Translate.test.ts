import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import { testConflict } from '@conflicts/TestUtilities';
import { ExpectedCollection } from '@conflicts/ExpectedCollection';
import { ExpectedThis } from '@conflicts/ExpectedThis';
import { MisplacedThis } from '@conflicts/MisplacedThis';
import Translate from '@nodes/Translate';
import This from '@nodes/This';

test.each([
    // Lists
    ['[1 1 1] ↦ ⬚ + 1', '[2 2 2]'],
    ['[1 2 3] ↦ ⬚ + 1', '[2 3 4]'],
    // Equivalent to the higher-order translate() call.
    ['[1 2 3].translate(ƒ(item) item + 1)', '[2 3 4]'],
    // Sets transform their values.
    ['{1 2 3} ↦ ⬚ + 1', '{2 3 4}'],
    // Maps transform their values, preserving keys.
    ['{1:10 2:20 3:30} ↦ ⬚ + 1', '{1:11 2:21 3:31}'],
    // `⬚` can have its properties and functions accessed cleanly.
    ['[[1 2] [3 4]] ↦ ⬚.first()', '[1 3]'],
    // Empty collections produce an empty collection of the same kind.
    ['[] ↦ ⬚', '[]'],
    // The RTL bar-arrow tokenizes to the same construct.
    ['[1 2 3] ↤ ⬚ + 1', '[2 3 4]'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

test('Translating a table rebuilds a table from the revised rows', () => {
    // Identity translate over a table yields the same table.
    expect(evaluateCode('⎡a•# b•#⎦⎡1 2⎦⎡3 4⎦ ↦ ⬚')?.toString()).toBe(
        evaluateCode('⎡a•# b•#⎦⎡1 2⎦⎡3 4⎦')?.toString(),
    );
});

test('The left side of a translate must be a collection', () => {
    testConflict(
        '[1 2 3] ↦ ⬚ + 1',
        '1 ↦ ⬚ + 1',
        Translate,
        ExpectedCollection,
    );
});

test('A translate body without ⬚ warns', () => {
    testConflict('[1 2 3] ↦ ⬚ + 1', '[1 2 3] ↦ 1', Translate, ExpectedThis);
});

test('⬚ outside a collection is misplaced, but is fine inside a translate', () => {
    testConflict('[1 2 3] ↦ ⬚ + 1', '1 + ⬚', This, MisplacedThis);
});
