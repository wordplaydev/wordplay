import { expect, test } from 'vitest';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '#parser/Symbols.ts';
import evaluateCode from '#runtime/evaluate.ts';

test.each([
    ['⎡a•# b•#⎦⎡1 2⎦ = ⎡a•# b•#⎦⎡1 2⎦', TRUE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ = ⎡a•# b•#⎦⎡1 3⎦', FALSE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ ≠ ⎡a•# b•#⎦⎡1 3⎦', TRUE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ = ø', FALSE_SYMBOL],
    ['⎡a•# b•#⎦⎡1 2⎦ ≠ ø', TRUE_SYMBOL],
    // A table converts to a list of its rows as structures (LANGUAGE.md, Table). A row's
    // structure has no name, which used to render as `undefined(…)`.
    ["⎡a•# b•''⎦⎡1 'x'⎦⎡2 'y'⎦ → []", '[(a: 1 b: "x") (a: 2 b: "y")]'],
    ["((⎡a•# b•''⎦⎡1 'x'⎦⎡2 'y'⎦ → [])[2]).b", '"y"'],
    ["⎡a•#⎦⎡1⎦⎡2⎦ → ''", '"⎡ 1 ⎦\n⎡ 2 ⎦"'],
])('%s = %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
