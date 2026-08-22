import evaluateCode from '@runtime/evaluate';
import { describe, expect, test } from 'vitest';

/**
 * Exhaustive control-flow coverage for the pattern engine (match.ts,
 * properties.ts, segment.ts, parsePattern.ts). Each `describe` targets one
 * branch family so every feasible path through the matcher is exercised by at
 * least one ⊤ and one ⊥ case. Complements Matcher.test.ts (feature happy-paths)
 * and Library.test.ts (realistic corpus); this file is the "every branch" net so
 * the sublanguage stays rock solid as it grows.
 */

const ev = (code: string) => evaluateCode(code)?.toString();

describe('quantifierBounds — every relation', () => {
    test.each([
        // exact count (undefined relation, no high)
        ["'55' ≈ ⣿2 #⣿", '⊤'],
        ["'5' ≈ ⣿2 #⣿", '⊥'],
        // range N–M (undefined relation, high present)
        ["'55' ≈ ⣿2–3 #⣿", '⊤'],
        ["'5' ≈ ⣿2–3 #⣿", '⊥'],
        // `>` : low+1..∞
        ["'5' ≈ ⣿>0 #⣿", '⊤'],
        ["'' ≈ ⣿>0 #⣿", '⊥'],
        // `≥` : low..∞
        ["'' ≈ ⣿≥0 #⣿", '⊤'],
        ["'55' ≈ ⣿≥2 #⣿", '⊤'],
        ["'5' ≈ ⣿≥2 #⣿", '⊥'],
        // `<` : 0..low-1
        ["'' ≈ ⣿<2 #⣿", '⊤'],
        ["'5' ≈ ⣿<2 #⣿", '⊤'],
        ["'55' ≈ ⣿<2 #⣿", '⊥'],
        // `≤` : 0..low
        ["'5' ≈ ⣿≤1 #⣿", '⊤'],
        ["'' ≈ ⣿≤1 #⣿", '⊤'],
        ["'55' ≈ ⣿≤1 #⣿", '⊥'],
        // `=` : exactly low
        ["'555' ≈ ⣿=3 #⣿", '⊤'],
        ["'55' ≈ ⣿=3 #⣿", '⊥'],
        // quantifier over a group, not just an atom
        ['\'ababab\' ≈ ⣿3 ("ab")⣿', '⊤'],
        ['\'abab\' ≈ ⣿3 ("ab")⣿', '⊥'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('base classes — every glyph', () => {
    test.each([
        ["'x' ≈ ⣿◌⣿", '⊤'],
        ["'5' ≈ ⣿#⣿", '⊤'],
        ["'a' ≈ ⣿#⣿", '⊥'],
        ["' ' ≈ ⣿␣⣿", '⊤'],
        ["'a' ≈ ⣿␣⣿", '⊥'],
        ["'a' ≈ ⣿_⣿", '⊤'],
        ["'5' ≈ ⣿_⣿", '⊥'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('class with property — known, intersection, unknown', () => {
    test.each([
        ["'α' ≈ ⣿_/greek⣿", '⊤'], // base ∩ property
        ["'5' ≈ ⣿_/greek⣿", '⊥'], // base fails
        ["'a' ≈ ⣿_/greek⣿", '⊥'], // property fails
        ["'A' ≈ ⣿◌/Lu⣿", '⊤'], // canonical id
        ["'α' ≈ ⣿◌/Script=Greek⣿", '⊤'], // Property=Value
        ["'x' ≈ ⣿_/bogus⣿", '⊥'], // unknown property → never matches
        ["'5' ≈ ⣿◌/emoji⣿", '⊥'], // emoji excludes digits (Emoji_Presentation)
        ["'👍' ≈ ⣿◌/emoji⣿", '⊤'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('named classes — known and unknown', () => {
    test.each([
        ["'a' ≈ ⣿linebreak⣿", '⊥'], // known class, non-matching grapheme
        ["'x' ≈ ⣿bogus⣿", '⊥'], // unknown bare name never matches
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('raw literals — no markup, no expressions, all delimiters', () => {
    test.each([
        // `@name` is literal characters, not a concept/character reference
        ['\'@foo\' ≈ ⣿"@foo"⣿', '⊤'],
        ['(\'see @foo ok\' ⌕ ⣿"@foo"⣿).length()', '1'],
        // an expression-looking literal matches the characters, not an evaluation
        ['\'1+1\' ≈ ⣿"1+1"⣿', '⊤'],
        ['\'2\' ≈ ⣿"1+1"⣿', '⊥'],
        // every text delimiter is accepted
        ["'x' ≈ ⣿'x'⣿", '⊤'],
        ["'x' ≈ ⣿“x”⣿", '⊤'],
        ["'x' ≈ ⣿‘x’⣿", '⊤'],
        ["'x' ≈ ⣿«x»⣿", '⊤'],
        ["'x' ≈ ⣿「x」⣿", '⊤'],
        // a literal containing one delimiter, expressed with another (no escaping)
        ["'\"' ≈ ⣿'\"'⣿", '⊤'],
        // a quoted digit is the literal character, not the digit class
        ['\'#\' ≈ ⣿"#"⣿', '⊤'],
        ['\'5\' ≈ ⣿"#"⣿', '⊥'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('sets — members, ranges, mixed, named class, negation', () => {
    test.each([
        ['\'b\' ≈ ⣿{"a" "b" "c"}⣿', '⊤'], // bare literal members
        ['\'z\' ≈ ⣿{"a" "b" "c"}⣿', '⊥'],
        ['\'c\' ≈ ⣿{"a"–"z"}⣿', '⊤'], // range member
        ['\'5\' ≈ ⣿{"a"–"z"}⣿', '⊥'],
        ['\'5\' ≈ ⣿{# "a"–"f"}⣿', '⊤'], // class + range
        ['\':\' ≈ ⣿{":" linebreak}⣿', '⊤'], // literal + named class
        ["'x' ≈ ⣿~{# ␣}⣿", '⊤'], // negated set (complement)
        ["'5' ≈ ⣿~{# ␣}⣿", '⊥'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('backreferences — match, off-end, named-class fallback', () => {
    test.each([
        // backref matches the same captured text
        ["('aa' ⌕ ⣿w:(_) w⣿).length()", '1'],
        // backref runs off the end of the text → no match
        ["('ab a' ⌕ ⣿w:(2 _) ␣ w⣿).length()", '0'],
        // a name that is also a known class still works as a class when uncaptured
        ["'a' ≈ ⣿linebreak⣿", '⊥'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('complement — class, property, set, end-of-text, negative lookaround', () => {
    test.each([
        ["'x' ≈ ⣿~#⣿", '⊤'],
        ["'5' ≈ ⣿~#⣿", '⊥'],
        ["'a' ≈ ⣿~◌/emoji⣿", '⊤'],
        ["'👍' ≈ ⣿~◌/emoji⣿", '⊥'],
        // complement at end-of-text fails (nothing to negate-consume)
        ["'a' ≈ ⣿_ ~◌⣿", '⊥'],
        // negative lookahead: position NOT followed by a digit
        ["'ab' ≈ ⣿~▸(#) _ _⣿", '⊤'],
        ["'1' ≈ ⣿~▸(#) ◌⣿", '⊥'], // '1' is a digit, so the negation fails
        // negative lookbehind: a letter NOT preceded by a digit
        ["('xa' ⌕ ⣿~◂(#) _⣿).length()", '2'],
        ["('1a' ⌕ ⣿~◂(#) _⣿).length()", '0'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('lookaround — positive ahead and behind', () => {
    test.each([
        ["'a1' ≈ ⣿▸(_) _ #⣿", '⊤'], // ahead: starts with a letter
        ["'11' ≈ ⣿▸(_) _ #⣿", '⊥'],
        ["('a1' ⌕ ⣿◂(_) #⣿).length()", '1'], // behind: digit preceded by letter
        ["('11' ⌕ ⣿◂(_) #⣿).length()", '0'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('anchors and empty pattern', () => {
    test.each([
        ["'a' ≈ ⣿⊢ _ ⊣⣿", '⊤'], // both anchors
        ["('a1a' ⌕ ⣿⊢ _⣿).length()", '1'], // start anchor only matches at 0
        ["('a1a' ⌕ ⣿_ ⊣⣿).length()", '1'], // end anchor only matches at end
        ["'' ≈ ⣿⣿", '⊤'], // empty pattern matches empty text
        ["'x' ≈ ⣿⣿", '⊥'], // ...but not non-empty
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('captures — positions, no leak across alternation, capture failure', () => {
    test('1-based inclusive start/end', () => {
        expect(ev("('xy12' ⌕ ⣿d:(2 #)⣿)[1].starts{'d'}")).toBe('3');
        expect(ev("('xy12' ⌕ ⣿d:(2 #)⣿)[1].ends{'d'}")).toBe('4');
    });
    test('a capture in a non-taken alternation branch does not leak', () => {
        // The left branch (with capture x) fails; the right branch wins, so x is
        // absent from the result's groups.
        expect(ev('(\'cd\' ⌕ ⣿x:("a") "b" | "c" "d"⣿)[1].groups{\'x\'}')).toBe(
            'ø',
        );
    });
    test('a capture whose atom fails propagates failure', () => {
        expect(ev("'a' ≈ ⣿x:(#)⣿")).toBe('⊥');
    });
});

describe('alternation — longest-match, order-independent, multi-item, residual', () => {
    test.each([
        ['\'cat\' ≈ ⣿"cat" | "dog"⣿', '⊤'],
        ['\'dog\' ≈ ⣿"cat" | "dog"⣿', '⊤'],
        // longest-match: the longer alternative wins, then the rest continues
        ['\'abc\' ≈ ⣿("a" | "ab") "c"⣿', '⊤'],
        ['\'ac\' ≈ ⣿("a" | "ab") "c"⣿', '⊤'],
        // order-independent: prefix alternative does not shadow the longer one
        ['\'cats\' ≈ ⣿"cat" | "cats"⣿', '⊤'],
        ['\'cats\' ≈ ⣿"cats" | "cat"⣿', '⊤'],
        // a longer-matching alternative wins regardless of position
        ['\'aa\' ≈ ⣿"a" | "aa" | "aaa"⣿', '⊤'],
        ['\'aa\' ≈ ⣿"aaa" | "a" | "aa"⣿', '⊤'],
        // multi-item left branch, rescued from start by a later `|`
        ['\'cd\' ≈ ⣿"a" "b" | "c" "d"⣿', '⊤'],
        ['\'abd\' ≈ ⣿"a" "b" | "c" "d"⣿', '⊤'],
        // residual: longest-match is possessive, so a shorter branch that would
        // leave room for the suffix is NOT reconsidered (no backtracking)
        ['\'aab\' ≈ ⣿("aa" | "a") "ab"⣿', '⊥'],
        // three-way
        ['\'b\' ≈ ⣿"a" | "b" | "c"⣿', '⊤'],
        ['\'z\' ≈ ⣿"a" | "b" | "c"⣿', '⊥'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('case fold — default, locale, with backref', () => {
    test.each([
        ['\'HELLO\' ≈ ⣿Aa("hello")⣿', '⊤'],
        ['\'World\' ≈ ⣿Aa("hello")⣿', '⊥'],
        ['\'İ\' ≈ ⣿Aa/tr("i")⣿', '⊤'], // Turkic dotted-İ
        ["('AbAB' ⌕ ⣿Aa(w:(2 _) w)⣿).length()", '1'], // fold scopes the backref
        // A bare Aa folds with Unicode's root mapping, not the locale of the
        // machine running the program: on a Turkish host these would flip.
        ['\'I\' ≈ ⣿Aa("i")⣿', '⊤'],
        ['\'I\' ≈ ⣿Aa/tr("i")⣿', '⊥'],
        // A multilingual tag has no BCP-47 form, so it folds by its primary
        // language rather than throwing.
        ['\'İ\' ≈ ⣿Aa/tr_en("i")⣿', '⊤'],
        ['\'HELLO\' ≈ ⣿Aa/es_en("hello")⣿', '⊤'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('word / word-edge — match, edge, malformed-locale fallback', () => {
    test.each([
        ["'cat' ≈ ⣿▭/en⣿", '⊤'],
        ["'cat dog' ≈ ⣿▭/en⣿", '⊥'],
        ['(\'a cat\' ⌕ ⣿┊/en "cat" ┊/en⣿).length()', '1'],
        // a malformed/multilingual tag falls back to the host segmenter, not a throw
        ["'cat' ≈ ⣿▭/xqz_zz⣿", '⊤'],
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('rest and grapheme correctness', () => {
    test.each([
        ['\'anyrest\' ≈ ⣿"any" …⣿', '⊤'], // rest at end
        ["'a123z' ≈ ⣿_ …⣿", '⊤'], // rest consumes the remainder
        ["'👨‍👩‍👧' ≈ ⣿◌⣿", '⊤'], // ZWJ family is ONE grapheme
        ["'👍🏽' ≈ ⣿◌/emoji⣿", '⊤'], // base scalar of a modified emoji
        ["'é' ≈ ⣿_⣿", '⊤'], // precomposed/decomposed both letters via NFC
        ['\'ab\' ≈ ⣿"ab "⣿', '⊥'], // literal off the end does not match
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});

describe('search — leftmost non-overlapping, zero-width, dedup', () => {
    test.each([
        ["('a1 b2 c3' ⌕ ⣿_ #⣿).length()", '3'],
        ["('xyz' ⌕ ⣿_ #⣿).length()", '0'],
        ["('id123' ⌕ ⣿>0 #⣿)[1].text", '"123"'], // greedy run, leftmost
        ["(('a1 a1 b2' ⌕ ⣿_ #⣿) → {}).size()", '3'], // distinct by position
    ])('%s -> %s', (code, expected) => {
        expect(ev(code)).toBe(expected);
    });
});
