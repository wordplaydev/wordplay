import { conflictsIn } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';

/**
 * Narrowing is recorded by node identity, so a use site only gets the narrowed type if
 * the walk from the guard physically visits it. Any expression whose `evaluateTypeGuards`
 * fails to recurse into a child silently drops narrowing for everything beneath it —
 * which reads to a creator as the same rule working on one line and failing on the next.
 *
 * Each program below narrows `x` to a number at the top of a branch and then uses it as
 * one, nested inside the construct named. A conflict means the walk didn't get there.
 *
 * Several of these looked like correct propagation but never ran: `Row`, `Input`,
 * `KeyValue`, and `Spread` extend `Node`, not `Expression`, so an `instanceof Expression`
 * filter over them is statically always-false.
 */
const declaration = `x•#|'': 1\n`;

test.each([
    // A block runs every statement, so a narrowing holds for all of them — not just the
    // last one, which was all it used to walk.
    ['a block, before the last statement', `x•# ? (y: x + 1\ny) 0`],
    // Entries of a map literal are KeyValue, which isn't an Expression.
    ['a map literal value', `x•# ? {'a': x + 1} {}`],
    ['a map literal key', `x•# ? {x + 1: 'a'} {}`],
    // A named argument is an Input, which isn't an Expression. Positional args worked.
    ['a named function input', `ƒ f(n•#) n\nx•# ? f(n: x) 0`],
    // Interpolated code inside text was never visited at all.
    ['text interpolation', `x•# ? '\\x + 1\\' ''`],
    // Only `~` was handled, and every other operator returned before visiting its operand.
    ['a non-negation unary operand', `x•# ? (-(x + 1)) 0`],
    // Match was a total no-op: it neither narrowed nor propagated.
    ['a match case value', `x•# ? (1 ??? 1: x + 1\n0) 0`],
    ['a match case key', `x•# ? (1 ??? x + 1: 2\n0) 0`],
    ['a match fallback', `x•# ? (1 ??? 2: 0\nx + 1) 0`],
    ['a match subject', `x•# ? (x + 1 ??? 2: 0\n0) 0`],
    // Otherwise was a total no-op too.
    // The left needs a type that really can be ø, or the `??` is itself a conflict.
    ['the left of ??', `m•{#:#}: {1: 1}\nx•# ? (m{x} ?? 0) 0`],
    ['the right of ??', `x•# ? (ø ?? (x + 1)) 0`],
    // Table rows are Row, which isn't an Expression.
    ['a table literal cell', `x•# ? (⎡a•#⎦⎡x⎦) (⎡a•#⎦)`],
    // These already worked; they're here so a regression in them is caught too, and
    // because the list/map inconsistency is what made the map failure look arbitrary.
    ['a list literal value', `x•# ? [x + 1] []`],
    ['a set literal value', `x•# ? {x + 1} {}`],
    ['a spread in a list', `x•# ? [:[x + 1]] []`],
    ['a positional function input', `ƒ f(n•#) n\nx•# ? f(x) 0`],
    ['a nested conditional', `x•# ? (⊤ ? x + 1 0) 0`],
    ['a structure input', `•P(n•#)\nx•# ? P(x + 1) P(0)`],
    ['a conversion', `x•# ? ((x + 1) → '') ''`],
])('narrowing reaches %s', (_name, program) => {
    expect(conflictsIn(declaration + program)).toEqual([]);
});

/**
 * The complement reaches the same places. Without this, a fix could pass everything above
 * by handing every child the *unnarrowed* set, which is the failure mode of a propagator
 * that recurses but forgets which set to pass.
 */
test.each([
    ['a block', `~(x•#) ? 0 (y: x + 1\ny)`],
    ['a map literal value', `~(x•#) ? {} {'a': x + 1}`],
    ['a named function input', `ƒ f(n•#) n\n~(x•#) ? 0 f(n: x)`],
    ['text interpolation', `~(x•#) ? '' '\\x + 1\\'`],
    ['a match case value', `~(x•#) ? 0 (1 ??? 1: x + 1\n0)`],
    ['the right of ??', `~(x•#) ? 0 (ø ?? (x + 1))`],
])('the false branch complement also reaches %s', (_name, program) => {
    expect(conflictsIn(declaration + program)).toEqual([]);
});
