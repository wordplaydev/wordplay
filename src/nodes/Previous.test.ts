import { testConflict } from '#conflicts/TestUtilities.ts';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import Previous from '#nodes/Previous.ts';
import evaluateOverTime from '#runtime/evaluateOverTime.ts';
import { expect, test } from 'vitest';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['← 1 Time(1000ms)', '← 1 2', Previous, IncompatibleInput, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);

// LANGUAGE.md: `←` is the value a number of evaluations ago, `←←` the list of the last few.
test.each([
    ['← 1 Time()', ['ø', '0ms', '100ms', '200ms']],
    ['← 2 Time()', ['ø', 'ø', '0ms', '100ms']],
    ['← 0 Time()', ['0ms', '100ms', '200ms', '300ms']],
    ['t: Time()\n← 1 t', ['ø', '0ms', '100ms', '200ms']],
    // Asking for more values than the stream holds yet gives all of them; the window used to
    // start at a negative index, which counted from the end and dropped the oldest.
    [
        '←← 3 Time()',
        ['[0ms]', '[0ms 100ms]', '[0ms 100ms 200ms]', '[100ms 200ms 300ms]'],
    ],
    [
        't: Time()\n←← 2 t',
        ['[0ms]', '[0ms 100ms]', '[100ms 200ms]', '[200ms 300ms]'],
    ],
    ['←← 0 Time()', ['[]', '[]', '[]', '[]']],
])('%s over time is %j', (code, values) => {
    expect(evaluateOverTime(code, 3)).toEqual(values);
});
