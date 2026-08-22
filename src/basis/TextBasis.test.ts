import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';

test('Test text functions', () => {
    expect(evaluateCode('"hello".length()')?.toString()).toBe('5');
    expect(evaluateCode('"hello" = ø')?.toString()).toBe('⊥');
    expect(evaluateCode('"hello" ≠ ø')?.toString()).toBe('⊤');
});

test.each([
    // Combine preserves a shared locale.
    ['"hello"/en + "hi"/en', '"hellohi"/en'],
    // An untagged operand inherits the tagged side's locale.
    ['"hello"/en + "!"', '"hello!"/en'],
    ['"!" + "hello"/en', '"!hello"/en'],
    // No locale anywhere stays untagged.
    ['"a" + "b"', '"ab"'],
    // Differing locales union their languages and regions.
    ['"a"/en + "b"/es', '"ab"/en_es'],
    ['"a"/en-US + "b"/fr-CA', '"ab"/en_fr-US_CA'],
    // Appending to a tagged literal keeps the tag (the motivating bug).
    ['greeting: "hello"/en\ngreeting + "!"', '"hello!"/en'],
    // Unary/structure-preserving ops keep the source locale.
    ['"x"/en.repeat(2)', '"xx"/en'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toWordplay()).toBe(expected);
});

test('segment fragments inherit the source locale', () => {
    expect(evaluateCode('"a,b,c"/en.segment(",")')?.toWordplay()).toBe(
        '["a"/en "b"/en "c"/en]',
    );
});

// Case conversion takes its locale from the text's own tag: only Turkish-tagged
// text gets Turkish's dotted/dotless i, and untagged text uses Unicode's root
// mapping rather than whatever locale the machine running the test is set to.
test.each([
    ['"hello".uppercase()', '"HELLO"'],
    ['"HELLO".lowercase()', '"hello"'],
    // The language tag survives the conversion, and decides the rules.
    ['"iyi"/tr.uppercase()', '"İYİ"/tr'],
    ['"iyi"/en.uppercase()', '"IYI"/en'],
    ['"iyi".uppercase()', '"IYI"'],
    ['"I"/tr.lowercase()', '"ı"/tr'],
    ['"I".lowercase()', '"i"'],
    // A multilingual tag has no BCP-47 form; its primary language decides.
    ['"iyi"/tr_en.uppercase()', '"İYİ"/tr_en'],
    // Uppercasing can lengthen text; that is Unicode's answer, not ours.
    ['"straße".uppercase()', '"STRASSE"'],
    // Greek final sigma is positional.
    ['"ΟΔΟΣ".lowercase()', '"οδος"'],
    // Scripts without case, and emoji, are unchanged.
    ['"日本語".uppercase()', '"日本語"'],
    ['"🐈📚".lowercase()', '"🐈📚"'],
    ['"".uppercase()', '""'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toWordplay()).toBe(expected);
});

// The reason for #1301: filtering a word list without caring about capitalization.
test('lowercase makes a starts-with check case-insensitive', () => {
    expect(
        evaluateCode(
            "['Apple' 'apricot' 'Banana'].filter(ƒ(word•'') word.lowercase().starts('a'))",
        )?.toWordplay(),
    ).toBe('["Apple" "apricot"]');
});

// Position-based operations count graphemes, matching length and → [''], so an
// emoji made of several code points is one symbol and never gets cut in half.
test.each([
    ['"hello".subsequence(2 4)', '"ell"'],
    ['"hello".subsequence(3)', '"llo"'],
    // The locale tag survives a slice.
    ['"hello"/en.subsequence(2 4)', '"ell"/en'],
    // Out of range clamps rather than failing.
    ['"hi".subsequence(0 99)', '"hi"'],
    // Past the end, clamping collapses the range onto the last symbol — the
    // same answer [1 2].subsequence(5 9) gives, which the test below pins.
    ['"hi".subsequence(5 9)', '"i"'],
    // An inverted range comes back reversed, matching List.subsequence.
    ['"hello".subsequence(4 2)', '"lle"'],
    ['"🐈📚!".subsequence(1 2)', '"🐈📚"'],
    ['"👨‍👩‍👧x".subsequence(1 1)', '"👨‍👩‍👧"'],
    // Reverse keeps whole graphemes too.
    ['"hello".reverse()', '"olleh"'],
    ['"🐈📚".reverse()', '"📚🐈"'],
    ['"hello"/en.reverse()', '"olleh"/en'],
    ['"  hi  ".trim()', '"hi"'],
    ['"  hi  "/en.trim()', '"hi"/en'],
    ['"a b".trim()', '"a b"'],
    ['"".trim()', '""'],
    // Replace changes every copy, and unions the locales the way combine does.
    ['"ha ha ha".replace("ha" "ho")', '"ho ho ho"'],
    ['"2026-08-21".replace("-" "/")', '"2026/08/21"'],
    ['"a"/en.replace("a" "b"/fr)', '"b"/en_fr'],
    // Replacing nothing is a no-op, not a splice between every symbol.
    ['"hi".replace("" "-")', '"hi"'],
    ['"hi".replace("z" "-")', '"hi"'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toWordplay()).toBe(expected);
});

test.each([
    ['"hello".index("ll")', '3'],
    ['"hello".index("h")', '1'],
    ['"hello".index("z")', 'ø'],
    ['"hello".index("")', 'ø'],
    // Counted in graphemes, so it agrees with subsequence's indexing rather
    // than pointing into the middle of an emoji the way a UTF-16 index would.
    ['"🐈📚x".index("x")', '3'],
    ['"👨‍👩‍👧x".index("x")', '2'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toWordplay()).toBe(expected);
});

// length counts what you see, so it can be used as a subsequence bound.
test.each([
    ['"👨‍👩‍👧".length()', '1'],
    ['"🐈📚".length()', '2'],
    ['"é".length()', '1'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});

test('index and subsequence agree on where a symbol is', () => {
    const code = 'w: "🐈 cat"\nw.subsequence(w.index("cat") ?? 1)';
    expect(evaluateCode(code)?.toWordplay()).toBe('"cat"');
});

// Text.subsequence and List.subsequence share a name, so they must not disagree.
test.each([
    ['1 3', '1 3'],
    ['2', '2'],
    ['0 99', '0 99'],
    ['5 9', '5 9'],
    ['3 1', '3 1'],
])('subsequence(%s) means the same on text and lists', (args) => {
    const text = evaluateCode(`"abc".subsequence(${args})`)?.toWordplay();
    const list = evaluateCode(
        `["a" "b" "c"].subsequence(${args}).join("")`,
    )?.toWordplay();
    expect(text).toBe(list);
});
