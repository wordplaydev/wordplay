import { UnknownConversion } from '#conflicts/UnknownConversion.ts';
import Convert from '#nodes/Convert.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import { NONE_SYMBOL, THIS_SYMBOL } from '#parser/Symbols.ts';
import { expect, test } from 'vitest';
import evaluateCode from '#runtime/evaluate.ts';

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

// A type without a text conversion of its own resolves `→ ''` to the basis's universal one, which
// accepted only structures at runtime: each of these analyzed cleanly and then halted with a type
// exception. They render the way a text template interpolates them.
test.each([
    ["(1‥3) → ''", '"1‥3"'],
    ["(ƒ(x•#) x) → ''", '"ƒ()"'],
    ["⣿#⣿ → ''", '"⣿#⣿"'],
    ["x•#|ø: 1234.5\nx → ''", '"1,234.5"'],
    ["x•''|ø: 'hi'\nx → ''", '"hi"'],
    ["x•#|ø: ø\nx → ''", `"${NONE_SYMBOL}"`],
    // A requested language is a rendering request whichever conversion answers it.
    ["x•#|ø: 5\nx → ''/hi-IN", '"५"/hi-IN'],
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
