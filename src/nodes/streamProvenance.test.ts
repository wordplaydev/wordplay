import { conflictsIn } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';

/**
 * Stream-ness is a property of an expression, not of a type. It used to be recorded in a
 * map keyed by type-node identity, and type nodes get rebuilt constantly — by concretize,
 * generalize, union folding, cloning — so each rebuild produced a node the map had never
 * heard of. Three patches existed only to re-register a stream onto whatever fresh node a
 * transform had just produced, and each was a bug report first: #1232, #1237, and this —
 * narrowing a stream's value type quietly pulled its stream-ness out from under the ∆
 * testing it.
 */
test.each([
    // Testing a stream for change and comparing its value in one breath. Three gallery
    // examples carry comments about the restructuring this forced.
    `key: Key()\n((∆ key) & (key = 'Enter')) ? 1 2`,
    // Order doesn't matter: the comparison narrows first here.
    `key: Key()\n((key = 'Enter') & (∆ key)) ? 1 2`,
    `key: Key()\n((∆ key) | (key = 'Enter')) ? 1 2`,
    // ← reads the same provenance.
    `key: Key()\n((key = 'Enter') & ((← 1 key) = 'a')) ? 1 2`,
    // A reaction's condition, which is where this shape actually appears.
    `key: Key()\n0 … (∆ key) & (key = 'Enter') … 1`,
])('narrowing a stream keeps it a stream: %s', (code) => {
    expect(conflictsIn(code)).toEqual([]);
});

/**
 * Only union-typed streams could ever hit this, which is why it looked arbitrary: Key()
 * and Webpage() are unions, while Time() is a plain number. This is the control.
 */
test('a non-union stream was never affected and still works', () => {
    expect(conflictsIn(`t: Time(150ms)\n((∆ t) & (t > 0ms)) ? 1 2`)).toEqual(
        [],
    );
});

/** The point of the check is still to reject things that aren't streams. */
test.each([
    // A plain value.
    `1 … ∆ 5 … 2`,
    // A name for a plain value.
    `n: 1ms\n1 … ∆ n … 2`,
    // An input's default doesn't make the parameter a stream — a caller may pass
    // anything, so this must stay a conflict.
    `ƒ f(t•#ms: Time(100ms)) ∆ t\nf(1ms)`,
])('still not a stream: %s', (code) => {
    expect(conflictsIn(code)).not.toEqual([]);
});
