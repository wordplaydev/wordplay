import evaluateOverTime from '#runtime/evaluateOverTime.ts';
import { expect, test } from 'vitest';

// `◆` is true only on a program's first evaluation. It depends on no stream, so a reevaluation used
// to reuse its first value — and everything built on it — leaving it true forever.
test.each([
    // LANGUAGE.md's example.
    [
        "Time()\n◆ ? 'first' 'next'",
        ['[0ms "first"]', '[100ms "next"]', '[200ms "next"]'],
    ],
    // The node's own doc example.
    ["◆ ? Time() 'hi'", ['0ms', '"hi"', '"hi"']],
    ['t: Time()\nx: ◆\n[t x]', ['[0ms ⊤]', '[100ms ⊥]', '[200ms ⊥]']],
    // With no stream, there is only ever the first evaluation.
    ['◆', ['⊤', '⊤', '⊤']],
])('%s over time is %j', (code, values) => {
    expect(evaluateOverTime(code, 2)).toEqual(values);
});
