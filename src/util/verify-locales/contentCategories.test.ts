import { describe, expect, test } from 'vitest';
import {
    localePrefixMatches,
    parseCategorySelection,
    tutorialTargetMatches,
    type Selection,
} from '@util/verify-locales/contentCategories';

/** Parse, asserting success (not a usage-error string). */
function sel(args: string[]): Selection {
    const result = parseCategorySelection(args);
    if (typeof result === 'string')
        throw new Error(`expected a Selection, got error: ${result}`);
    return result;
}

describe('parseCategorySelection — modes', () => {
    test('no flags → everything included', () => {
        const s = sel(['zh-CN']);
        for (const c of [
            'locale',
            'tutorial',
            'quick',
            'howto',
            'emoji',
        ] as const)
            expect(s.isIncluded(c)).toBe(true);
        expect(s.flags).toEqual([]);
    });

    test('exclude (-) does everything but the listed categories', () => {
        const s = sel(['zh-CN', '-quick', '-emoji']);
        expect(s.isIncluded('quick')).toBe(false);
        expect(s.isIncluded('emoji')).toBe(false);
        expect(s.isIncluded('locale')).toBe(true);
        expect(s.isIncluded('tutorial')).toBe(true);
        expect(s.isIncluded('howto')).toBe(true);
        expect(s.flags).toEqual(['-quick', '-emoji']);
    });

    test('include (+) does only the listed categories', () => {
        const s = sel(['zh-CN', '+howto']);
        expect(s.isIncluded('howto')).toBe(true);
        expect(s.isIncluded('locale')).toBe(false);
        expect(s.isIncluded('emoji')).toBe(false);
    });

    test('locale names and --jobs are not treated as flags', () => {
        const s = sel(['--jobs', '4', 'zh-CN', '-emoji']);
        expect(s.flags).toEqual(['-emoji']);
    });
});

describe('parseCategorySelection — specifiers', () => {
    test('locale path prefixes collected', () => {
        const s = sel(['+locale:output.Phrase', '+locale:basis.Text']);
        expect(s.localePrefixes()).toEqual(['output.Phrase', 'basis.Text']);
        expect(s.isIncluded('locale')).toBe(true);
        expect(s.isIncluded('tutorial')).toBe(false);
    });

    test('tutorial act and act/scene targets (1-based)', () => {
        const s = sel(['+tutorial:1', '+tutorial:2/3']);
        expect(s.tutorialTargets()).toEqual([
            { act: 1 },
            { act: 2, scene: 3 },
        ]);
    });

    test('quick targets are separate from tutorial targets', () => {
        const s = sel(['+quick:2']);
        expect(s.quickTargets()).toEqual([{ act: 2 }]);
        expect(s.tutorialTargets()).toEqual([]);
    });

    test('howto ids collected', () => {
        const s = sel(['+howto:animate-phrase', '+howto:make-a-scene']);
        expect(s.howtoIds()).toEqual(['animate-phrase', 'make-a-scene']);
    });
});

describe('parseCategorySelection — usage errors', () => {
    test('mixing + and - is an error', () => {
        expect(parseCategorySelection(['+howto', '-emoji'])).toMatch(
            /mix.*include.*exclude/i,
        );
    });

    test('a specifier on an exclude flag is an error', () => {
        expect(parseCategorySelection(['-locale:output.Phrase'])).toMatch(
            /specifier.*include/i,
        );
    });

    test('a specifier on emoji is an error', () => {
        expect(parseCategorySelection(['+emoji:foo'])).toMatch(/emoji/i);
    });

    test('an unknown category is an error', () => {
        expect(parseCategorySelection(['+bogus'])).toMatch(/unknown/i);
    });

    test('a malformed tutorial target is an error', () => {
        expect(parseCategorySelection(['+tutorial:abc'])).toMatch(/target/i);
        expect(parseCategorySelection(['+tutorial:0'])).toMatch(/target/i);
        expect(parseCategorySelection(['+tutorial:1/2/3'])).toMatch(/target/i);
    });
});

describe('localePrefixMatches', () => {
    test('exact and descendant match; sibling-with-shared-prefix does not', () => {
        expect(localePrefixMatches('output.Phrase', 'output.Phrase')).toBe(true);
        expect(localePrefixMatches('output.Phrase.doc', 'output.Phrase')).toBe(
            true,
        );
        expect(localePrefixMatches('output.Phraser', 'output.Phrase')).toBe(
            false,
        );
    });
});

describe('tutorialTargetMatches', () => {
    test('act-only target matches the whole act', () => {
        expect(tutorialTargetMatches(1, 5, { act: 1 })).toBe(true);
        expect(tutorialTargetMatches(2, 5, { act: 1 })).toBe(false);
    });

    test('act/scene target matches only that scene', () => {
        expect(tutorialTargetMatches(1, 3, { act: 1, scene: 3 })).toBe(true);
        expect(tutorialTargetMatches(1, 4, { act: 1, scene: 3 })).toBe(false);
    });
});
