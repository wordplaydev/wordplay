import evaluateCode from '@runtime/evaluate';
import { describe, expect, test } from 'vitest';

/** Evaluate a snippet and return its textual value. */
const ev = (code: string) => evaluateCode(code)?.toString();

describe('≈ whole-text test', () => {
    test.each([
        // Classes
        ["'a' ≈ ⣿_⣿", '⊤'],
        ["'5' ≈ ⣿_⣿", '⊥'],
        ["'5' ≈ ⣿#⣿", '⊤'],
        ["'x' ≈ ⣿◌⣿", '⊤'],
        ["' ' ≈ ⣿␣⣿", '⊤'],
        // Literals
        ['\'ab\' ≈ ⣿"ab"⣿', '⊤'],
        ['\'ax\' ≈ ⣿"ab"⣿', '⊥'],
        // Quantifiers
        ["'555' ≈ ⣿3 #⣿", '⊤'],
        ["'55' ≈ ⣿3 #⣿", '⊥'],
        ["'5555' ≈ ⣿3 #⣿", '⊥'],
        ["'12' ≈ ⣿2–4 #⣿", '⊤'],
        ["'12345' ≈ ⣿2–4 #⣿", '⊥'],
        // A typed hyphen `-` is accepted as the range dash, like the en-dash `–`.
        ["'123' ≈ ⣿3-5 #⣿", '⊤'],
        ["'12' ≈ ⣿3-5 #⣿", '⊥'],
        ["'123456' ≈ ⣿3-5 #⣿", '⊥'],
        ['\'c\' ≈ ⣿{"a"-"z"}⣿', '⊤'],
        ['\'5\' ≈ ⣿{"a"-"z"}⣿', '⊥'],
        ["'1' ≈ ⣿>0 #⣿", '⊤'],
        ["'' ≈ ⣿>0 #⣿", '⊥'],
        ["'' ≈ ⣿≥0 #⣿", '⊤'],
        ["'5' ≈ ⣿≤1 #⣿", '⊤'],
        ["'' ≈ ⣿≤1 #⣿", '⊤'],
        // The canonical phone example
        ['\'555-1234\' ≈ ⣿3 # "-" 4 #⣿', '⊤'],
        // Alternation is longest-match and order-independent (LANGUAGE.md):
        // both operands are tried from the start and the longer wins.
        ['\'cat\' ≈ ⣿"cat" | "dog"⣿', '⊤'],
        ['\'dog\' ≈ ⣿("cat" | "dog")⣿', '⊤'],
        ['\'ac\' ≈ ⣿("a" | "ab") "c"⣿', '⊤'],
        ['\'abc\' ≈ ⣿("a" | "ab") "c"⣿', '⊤'], // longest "ab", then "c" → matches
        // Order-independent: a prefix alternative does not shadow the longer one.
        ['\'cats\' ≈ ⣿"cat" | "cats"⣿', '⊤'],
        ['\'cats\' ≈ ⣿"cats" | "cat"⣿', '⊤'],
        // Residual (a no-backtracking limit, not an ordering one): the longest
        // branch can still strand a suffix a shorter branch would have fit.
        ['\'aab\' ≈ ⣿("aa" | "a") "ab"⣿', '⊥'],
        // Alternation with a multi-item left branch (no precedence, left assoc):
        // `"a" "b" | "c" "d"` is `((("a"·"b")|"c")·"d")`, so both `abd` and `cd` match.
        ['\'cd\' ≈ ⣿"a" "b" | "c" "d"⣿', '⊤'],
        ['\'abd\' ≈ ⣿"a" "b" | "c" "d"⣿', '⊤'],
        ['\'b\' ≈ ⣿"a" "a" | "b"⣿', '⊤'],
        ['\'de\' ≈ ⣿"a" | "b" "c" | "d" "e"⣿', '⊤'],
        // A literal running off the end of the text must fail (no phantom space).
        ['\'ab\' ≈ ⣿"ab "⣿', '⊥'],
        ['\'x\' ≈ ⣿"xy"⣿', '⊥'],
        // Sets and ranges
        ['\'c\' ≈ ⣿{"a"–"z"}⣿', '⊤'],
        ['\'5\' ≈ ⣿{"a"–"z"}⣿', '⊥'],
        ['\'#ff00aa\' ≈ ⣿"#" 6 {# "a"–"f"}⣿', '⊤'],
        ['\'#FF00AA\' ≈ ⣿"#" 6 {# "a"–"f" "A"–"F"}⣿', '⊤'],
        // Complement
        ["'x' ≈ ⣿~#⣿", '⊤'],
        ["'5' ≈ ⣿~#⣿", '⊥'],
        // Quantified complement (a quantifier may apply to a `~atom`)
        ["'xy' ≈ ⣿2 ~#⣿", '⊤'],
        ["'x5' ≈ ⣿2 ~#⣿", '⊥'],
        ["'abc' ≈ ⣿>0 ~#⣿", '⊤'],
        ['\'name\' ≈ ⣿>0 ~{":" ␣}⣿', '⊤'],
        // Anchors and rest
        ["'a' ≈ ⣿⊢ _ ⊣⣿", '⊤'],
        ['\'anything\' ≈ ⣿"any" …⣿', '⊤'],
        // Integer or decimal
        ['\'3.14\' ≈ ⣿≤1 "-" >0 # ≤1 ("." >0 #)⣿', '⊤'],
        ['\'-7\' ≈ ⣿≤1 "-" >0 # ≤1 ("." >0 #)⣿', '⊤'],
        ['\'42\' ≈ ⣿≤1 "-" >0 # ≤1 ("." >0 #)⣿', '⊤'],
        // Case fold
        ['\'HELLO\' ≈ ⣿Aa("hello")⣿', '⊤'],
        ['\'Hello\' ≈ ⣿Aa("hello")⣿', '⊤'],
        // Lookahead (zero-width)
        ["'a1' ≈ ⣿▸(_) _ #⣿", '⊤'],
        ["'11' ≈ ⣿▸(_) _ #⣿", '⊥'],
        // Grapheme correctness: é (precomposed vs decomposed) matches as a letter
        ["'é' ≈ ⣿_⣿", '⊤'],
        ["'é' ≈ ⣿_⣿", '⊤'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('⌕ search', () => {
    test.each([
        // Leftmost, non-overlapping
        ["('a1 b2 c3' ⌕ ⣿_ #⣿).length()", '3'],
        ["('xyz' ⌕ ⣿_ #⣿).length()", '0'],
        // A literal that runs off the end yields no phantom match.
        ['(\'ab\' ⌕ ⣿"ab "⣿).length()', '0'],
        // Greedy run
        ["('id123' ⌕ ⣿>0 #⣿)[1].text", '"123"'],
        // Captures: groups + 1-based positions
        [
            '(\'2026-06-15\' ⌕ ⣿y:(4 #) "-" m:(2 #) "-" d:(2 #)⣿)[1].groups{\'y\'}',
            '"2026"',
        ],
        [
            '(\'2026-06-15\' ⌕ ⣿y:(4 #) "-" m:(2 #) "-" d:(2 #)⣿)[1].groups{\'m\'}',
            '"06"',
        ],
        [
            '(\'2026-06-15\' ⌕ ⣿y:(4 #) "-" m:(2 #) "-" d:(2 #)⣿)[1].starts{\'y\'}',
            '1',
        ],
        [
            '(\'2026-06-15\' ⌕ ⣿y:(4 #) "-" m:(2 #) "-" d:(2 #)⣿)[1].ends{\'y\'}',
            '4',
        ],
        [
            '(\'2026-06-15\' ⌕ ⣿y:(4 #) "-" m:(2 #) "-" d:(2 #)⣿)[1].starts{\'d\'}',
            '9',
        ],
        // Results are distinct by position, so `→ {}` keeps all three
        // (even the two identical "a1" texts) — LANGUAGE.md.
        ["(('a1 a1 b2' ⌕ ⣿_ #⣿) → {}).size()", '3'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('Unicode properties & named classes', () => {
    test.each([
        // Script intersection (base scalar)
        ["'α' ≈ ⣿_/greek⣿", '⊤'],
        ["'a' ≈ ⣿_/greek⣿", '⊥'],
        ["'5' ≈ ⣿_/greek⣿", '⊥'],
        // Binary property
        ["'👍' ≈ ⣿◌/emoji⣿", '⊤'],
        ["'a' ≈ ⣿◌/emoji⣿", '⊥'],
        // Case shorthand
        ["'A' ≈ ⣿_/uppercase⣿", '⊤'],
        ["'a' ≈ ⣿_/uppercase⣿", '⊥'],
        // Canonical Unicode ids
        ["'A' ≈ ⣿_/Lu⣿", '⊤'],
        ["'5' ≈ ⣿◌/Nd⣿", '⊤'],
        // Property=value
        ["'α' ≈ ⣿◌/Script=Greek⣿", '⊤'],
        // Categories
        ["'.' ≈ ⣿◌/punctuation⣿", '⊤'],
        ["'$' ≈ ⣿◌/currency⣿", '⊤'],
        // Bare named class (linebreak), negative case
        ["'a' ≈ ⣿linebreak⣿", '⊥'],
        // Named class inside a set
        ['\':\' ≈ ⣿{":" linebreak}⣿', '⊤'],
        // Complement over a property
        ["'a' ≈ ⣿~◌/emoji⣿", '⊤'],
        ["'👍' ≈ ⣿~◌/emoji⣿", '⊥'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('word & word-edge (locale segmentation)', () => {
    test.each([
        // A single word matches the whole text; two words do not.
        ["'cat' ≈ ⣿▭/en⣿", '⊤'],
        ["'cat dog' ≈ ⣿▭/en⣿", '⊥'],
        // Whole word via edges vs. a substring of a longer word (LANGUAGE.md).
        ['(\'a cat sat\' ⌕ ⣿┊/en "cat" ┊/en⣿) ≠ []', '⊤'],
        ['(\'category\' ⌕ ⣿┊/en "cat" ┊/en⣿) ≠ []', '⊥'],
        // Doubled word with a backref (LANGUAGE.md).
        ["('the the' ⌕ ⣿w: ▭/en >0 ␣ w⣿) ≠ []", '⊤'],
        ["('the cat' ⌕ ⣿w: ▭/en >0 ␣ w⣿) ≠ []", '⊥'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('case folding (locale-aware)', () => {
    test.each([
        ['\'HELLO\' ≈ ⣿Aa("hello")⣿', '⊤'],
        ['\'Hello\' ≈ ⣿Aa("hello")⣿', '⊤'],
        // Turkic dotted-İ folds to i with /tr.
        ['\'İ\' ≈ ⣿Aa/tr("i")⣿', '⊤'],
        // Fold scopes a backref too.
        ["('AbAB' ⌕ ⣿Aa(w:(2 _) w)⣿) ≠ []", '⊤'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});
