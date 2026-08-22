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
