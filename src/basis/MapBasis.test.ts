import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['{1:"hi" 2:"bye"}.pair(3 "hello")', '{1:"hi" 2:"bye" 3:"hello"}'],
    ['{1:"hi" 2:"bye"}.pair(1 "hello")', '{1:"hello" 2:"bye"}'],
    ['{1:"hi" 2:"bye"}.unpair(1)', '{2:"bye"}'],
    ['{1:"hi" 2:"bye"}.remove("bye")', '{1:"hi"}'],
    ["{'cat':1 'dog':2 'mouse':3}.filter(ƒ(k v) v ≥ 3)", '{"mouse":3}'],
    [
        "{'cat':1 'dog':2 'mouse':3}.translate(ƒ(k v) -v)",
        '{"cat":-1 "dog":-2 "mouse":-3}',
    ],
    ['{1:1 2:2} = ø', '⊥'],
    ['{1:1 2:2} ≠ ø', '⊤'],
])('Expect %s to be %s map functions', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
