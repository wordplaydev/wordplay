import { test, expect } from 'vitest';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '../parser/Symbols';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['•Cat(name•"")\nCat("a") = Cat("a")', TRUE_SYMBOL],
    ['•Cat(name•"")\nCat("a") = Cat("b")', FALSE_SYMBOL],
    ['•Cat(name•"")\nCat("a") ≠ Cat("b")', TRUE_SYMBOL],
    ['•Cat(name•"") (ƒ meow() name)\nCat("a") = Cat("a")', TRUE_SYMBOL],
    ['•Cat(name•"") (ƒ meow() name)\nCat("a") ≠ Cat("a")', FALSE_SYMBOL],
    ['•Cat(name•"")\nCat("a")→""', '"Cat(name: "a")"'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
