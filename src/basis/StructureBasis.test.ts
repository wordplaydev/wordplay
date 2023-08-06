import { test, expect } from 'vitest';
import Evaluator from '@runtime/Evaluator';
import { DefaultLocale } from '../db/Creator';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '../parser/Symbols';

test.each([
    ['•Cat(name•"")\nCat("a") = Cat("a")', TRUE_SYMBOL],
    ['•Cat(name•"")\nCat("a") = Cat("b")', FALSE_SYMBOL],
    ['•Cat(name•"")\nCat("a") ≠ Cat("b")', TRUE_SYMBOL],
    ['•Cat(name•"") (ƒ meow() name)\nCat("a") = Cat("a")', TRUE_SYMBOL],
    ['•Cat(name•"") (ƒ meow() name)\nCat("a") ≠ Cat("a")', FALSE_SYMBOL],
    ['•Cat(name•"")\nCat("a")→""', '"Cat(name: "a")"'],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(DefaultLocale, code)?.toString()).toBe(value);
});
