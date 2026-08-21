import { UnknownConversion } from '@conflicts/UnknownConversion';
import Convert from '@nodes/Convert';
import { testConflict } from '@conflicts/TestUtilities';
import { NONE_SYMBOL, THIS_SYMBOL } from '@parser/Symbols';
import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';

test.each([
    ["⊤→''", '"⊤"'],
    [`${NONE_SYMBOL}→''`, `"${NONE_SYMBOL}"`],
    ["'boomy'→['']", '["b" "o" "o" "m" "y"]'],
    ["1.234→''", '"1.234"'],
    ["{1 2 3}→''", '"{1 2 3}"'],
    ['{1 2 3}→[]', '[1 2 3]'],

    ["[1 2 3]→''", '"[1 2 3]"'],
    ['[1 1 1]→{}', '{1}'],
    ["{1:'cat' 2:'dog' 3:'rat'}→''", '"{1:"cat" 2:"dog" 3:"rat"}"'],
    ["{1:'cat' 2:'dog' 3:'rat'}→{}", '{1 2 3}'],
    ["{1:'cat' 2:'dog' 3:'rat'}→[]", '["cat" "dog" "rat"]'],
    [`→ #s #kitty ${THIS_SYMBOL} × 1kitty + 1kitty\n5s→#kitty`, '6kitty'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([["1 → ''", '1 → ⎡a•#⎦', Convert, UnknownConversion, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
