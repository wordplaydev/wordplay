import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';
import eligibleWritingLayouts from './eligibleWritingLayouts';

const eligible = (code: string) =>
    eligibleWritingLayouts(new Source('test', code));

describe('what a source is eligible for', () => {
    test('horizontal is always offered, and always first', () => {
        // The creator can always fall back to it, whatever the code says.
        for (const code of [
            "Phrase('hi')",
            "フレーズ('こんにちは')",
            '',
            '1 + 1',
        ])
            expect(eligible(code)[0]).toBe('horizontal-tb');
    });

    test('Latin-only code is horizontal alone', () => {
        expect(eligible("Phrase('magnificent!')")).toEqual(['horizontal-tb']);
    });

    test('Japanese, Korean and Chinese offer their own direction', () => {
        for (const code of [
            "挨拶: 'こんにちは、世界'",
            "인사: '안녕하세요'",
            "问候: '你好世界'",
        ])
            expect(eligible(code)).toEqual(['horizontal-tb', 'vertical-rl']);
    });

    test('Mongolian offers the other direction', () => {
        // The reason eligibility is a layout and not a flag: these two are not
        // interchangeable, and no script uses both.
        expect(eligible("ᠮᠣᠩᠭᠣᠯ: 'ᠪᠢᠴᠢᠭ'")).toEqual([
            'horizontal-tb',
            'vertical-lr',
        ]);
    });

    test('mixing Latin with Japanese is horizontal', () => {
        // Latin has one mode and Japanese has both, so the mode they share is
        // horizontal. This is the rule the whole feature turns on.
        expect(eligible("greeting: 'こんにちは'\nPhrase(greeting)")).toEqual([
            'horizontal-tb',
        ]);
    });
});

describe('what must not disqualify a source', () => {
    test("Wordplay's own Latin-letter syntax", () => {
        // `ƒ` and `ø` are LATIN SMALL LETTER F WITH HOOK and O WITH STROKE, so a
        // naive letter scan would make every program that declares a function or
        // names nothing ineligible. They lex as their own symbols, not as names.
        expect(eligible('挨拶: ƒ() ø\nフレーズ(挨拶)')).toEqual([
            'horizontal-tb',
            'vertical-rl',
        ]);
    });

    test('a unit, whose name lexes as an ordinary name', () => {
        // `1.5m` produces a Name token `m`. Without skipping Dimension nodes,
        // every program that measures anything would be horizontal-only.
        expect(eligible('フレーズ(挨拶 大きさ: 1.5m)')).toEqual([
            'horizontal-tb',
            'vertical-rl',
        ]);
        expect(eligible('速さ: 2m/s')).toEqual([
            'horizontal-tb',
            'vertical-rl',
        ]);
    });

    test("ISO's composite script codes, which Unicode has no value for", () => {
        // Scripts.ts declares Hans, Hant and Kore vertical, but Unicode has no
        // such script values — Chinese text is Han, Korean is Hangul and Han.
        // Those components carry the same layout, so both still resolve; this
        // is what makes skipping the composites safe rather than lossy.
        for (const code of ["简体: '你好'", "繁體: '你好'", "한국어: '안녕'"])
            expect(eligible(code)).toEqual(['horizontal-tb', 'vertical-rl']);
    });

    test('the katakana prolongation mark, which is Script=Common', () => {
        // `ー` in `フレーズ` carries Script=Common with Script_Extensions of
        // Hiragana and Katakana, so a `\p{Script=Katakana}` test rejects it and
        // Japanese becomes permanently ineligible. `\p{scx=}` is what sees it.
        expect('ー'.match(/\p{Script=Katakana}/u)).toBeNull();
        expect(eligible('フレーズ: 1\nグループ: 2')).toEqual([
            'horizontal-tb',
            'vertical-rl',
        ]);
    });
});

describe('what disqualifies a source', () => {
    test('two vertical scripts that disagree', () => {
        // Japanese runs its columns right to left and Mongolian left to right,
        // so there is no vertical layout they share.
        expect(eligible("挨拶: 'ᠪᠢᠴᠢᠭ'")).toEqual(['horizontal-tb']);
    });

    test('a single Latin name among Japanese ones', () => {
        // The case a creator actually hits: one borrowed name is enough.
        expect(eligible('挨拶: 1\nvalue: 2')).toEqual(['horizontal-tb']);
    });
});

describe('sources with nothing to go on', () => {
    test('symbols, digits and units alone are horizontal', () => {
        // Nothing here is a letter a reader reads, so there is no vertical
        // tradition to appeal to.
        expect(eligible('1.5m + 2 = 3')).toEqual(['horizontal-tb']);
    });

    test('an empty source is horizontal', () => {
        expect(eligible('')).toEqual(['horizontal-tb']);
    });
});
