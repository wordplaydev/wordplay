import { NONE_SYMBOL, PROPERTY_SYMBOL } from '@parser/Symbols';
import { expect, test } from 'vitest';
import evaluateCode from '../runtime/evaluate';

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
    [`→ #s #kitty ${PROPERTY_SYMBOL} · 1kitty + 1kitty\n5s→#kitty`, '6kitty'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
