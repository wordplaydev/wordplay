import evaluateCode from '@runtime/evaluate';
import { expect, test } from 'vitest';

test.each([
    // ≈ whole-text test → boolean
    ['\'abc\' ≈ ⣿"abc"⣿', '⊤'],
    ['\'abx\' ≈ ⣿"abc"⣿', '⊥'],
    ["'a5' ≈ ⣿_ #⣿", '⊤'],
    ["'5a' ≈ ⣿_ #⣿", '⊥'],
    ['\'ab\' ≈ ⣿◌ ◌⣿', '⊤'],
    ['\'a\' ≈ ⣿◌ ◌⣿', '⊥'],
    // ⌕ search → list of Result
    ["('a1 b2' ⌕ ⣿_ #⣿).length()", '2'],
    ["('xyz' ⌕ ⣿_ #⣿).length()", '0'],
    ["('a1' ⌕ ⣿_ #⣿)[1].text", '"a1"'],
    ["('a1' ⌕ ⣿_ #⣿)[1].start", '1'],
    ["('a1' ⌕ ⣿_ #⣿)[1].end", '2'],
])('evaluates %s -> %s', (code: string, expected: string) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});
