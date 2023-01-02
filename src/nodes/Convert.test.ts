import { test, expect } from 'vitest';
import { NONE_SYMBOL } from '../parser/Tokenizer';
import Evaluator from '../runtime/Evaluator';

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
    ['→ #s #kitty * · 1kitty + 1kitty\n5s→#kitty', '6kitty'],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(code)?.toString()).toBe(value);
});
