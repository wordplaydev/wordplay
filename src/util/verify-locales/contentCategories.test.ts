import { describe, expect, test } from 'vitest';
import {
    CONTENT_CATEGORIES,
    localePrefixMatches,
    parseCategorySelection,
    parsePositionals,
    stepsFor,
    tutorialTargetMatches,
    type RunSteps,
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
        expect(s.tutorialTargets()).toEqual([{ act: 1 }, { act: 2, scene: 3 }]);
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

    test('example names collected', () => {
        const s = sel(['+example:Adventure', '+example:FrenchNumbers']);
        expect(s.exampleIds()).toEqual(['Adventure', 'FrenchNumbers']);
        expect(s.isIncluded('example')).toBe(true);
        expect(s.isIncluded('locale')).toBe(false);
    });
});

describe('parseCategorySelection — explicit inclusion', () => {
    // Gallery examples are opt-in per locale: included by default like every
    // category, but only an explicit `+example` opts a locale in for the
    // first (paid) translation of its 75 files.
    test('a no-flag run includes example but not explicitly', () => {
        const s = sel(['es-MX']);
        expect(s.isIncluded('example')).toBe(true);
        expect(s.isExplicitlyIncluded('example')).toBe(false);
    });

    test('+example is explicit, with or without a specifier', () => {
        expect(sel(['+example']).isExplicitlyIncluded('example')).toBe(true);
        expect(
            sel(['+example:Adventure']).isExplicitlyIncluded('example'),
        ).toBe(true);
    });

    test('an exclude run is never explicit', () => {
        const s = sel(['-emoji']);
        expect(s.isIncluded('example')).toBe(true);
        expect(s.isExplicitlyIncluded('example')).toBe(false);
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

describe('isNarrowedOut', () => {
    test('a no-flag run narrows nothing out', () => {
        const s = sel(['zh-CN']);
        for (const c of CONTENT_CATEGORIES)
            expect(s.isNarrowedOut(c)).toBe(false);
    });

    // The regression test for `npm run locales`, `npm run locales-fix`, and the
    // batch's own `-kit` children: a `-` flag scopes translation only, so every
    // category's verification still runs. If this goes red, a parallel batch child
    // has stopped verifying the locale it is translating.
    test('an exclude run narrows nothing out', () => {
        const s = sel(['zh-CN', '-kit', '-quick', '-emoji']);
        for (const c of CONTENT_CATEGORIES)
            expect(s.isNarrowedOut(c)).toBe(false);
    });

    test('+kit narrows out every other category', () => {
        const s = sel(['+kit']);
        for (const c of CONTENT_CATEGORIES)
            expect(s.isNarrowedOut(c)).toBe(c !== 'kit');
    });

    // A specifier narrows *within* a category, never which categories are in scope.
    test('+kit:tunes narrows out exactly what +kit does', () => {
        const bare = sel(['+kit']);
        const named = sel(['+kit:tunes']);
        for (const c of CONTENT_CATEGORIES)
            expect(named.isNarrowedOut(c)).toBe(bare.isNarrowedOut(c));
    });
});

describe('stepsFor', () => {
    const all: (keyof RunSteps)[] = [
        'locale',
        'tutorial',
        'quick',
        'glossaryUsage',
        'howto',
        'example',
        'kit',
        'changelog',
        'datetimes',
        'drift',
        'artifacts',
    ];

    /** Assert exactly `expected` are true and every other step is false. */
    function only(args: string[], expected: (keyof RunSteps)[]) {
        const steps = stepsFor(sel(args));
        for (const step of all)
            expect([step, steps[step]]).toEqual([
                step,
                expected.includes(step),
            ]);
    }

    test('a no-flag run does everything', () => {
        only([], all);
    });

    // The byte-for-byte guarantee: excluding a category from translation must not
    // stop any step from running.
    test('an exclude run does everything', () => {
        only(['-kit', '-quick'], all);
    });

    test('+kit does kits and nothing else', () => {
        only(['+kit'], ['kit']);
    });

    // How-tos and localized examples are derived from the locale's names, so a
    // `+locale` run re-derives them even though it didn't name them. Dropping
    // these two would strand them and red `exampleNamesSync.test.ts` and
    // `localizedExamplesSync.test.ts` in the sweep project.
    test('+locale pulls in the content derived from locale names', () => {
        only(['+locale'], ['locale', 'howto', 'example', 'artifacts']);
    });

    test('the two tutorial categories are separate', () => {
        only(['+tutorial:2'], ['tutorial']);
    });

    test('+example and +changelog do their own only', () => {
        only(['+example'], ['example']);
        only(['+changelog:0.35.0'], ['changelog']);
    });

    // A glossary word is reported unused from the locale's own text, most of which
    // is the lessons; a run that loaded neither tutorial can't make that claim.
    test('glossary usage and drift need the locale and both tutorials', () => {
        for (const flags of [['+locale'], ['+tutorial'], ['+quick']]) {
            const steps = stepsFor(sel(flags));
            expect(steps.glossaryUsage).toBe(false);
            expect(steps.drift).toBe(false);
        }
    });

    // `emoji` has no step: its own gate is `isIncluded`, because generation is paid
    // work with no verification half.
    test('emoji is not a step', () => {
        expect(Object.keys(stepsFor(sel([])))).not.toContain('emoji');
        expect(CONTENT_CATEGORIES.includes('emoji')).toBe(true);
    });
});

describe('parsePositionals', () => {
    test('locales are found whichever side of the flags they sit on', () => {
        expect(parsePositionals(['zh-CN', '+kit'])).toEqual(['zh-CN']);
        expect(parsePositionals(['+kit', 'zh-CN'])).toEqual(['zh-CN']);
    });

    test('no locale means every locale', () => {
        expect(parsePositionals(['+kit'])).toEqual([]);
        expect(parsePositionals([])).toEqual([]);
    });

    test('several locales are kept in order', () => {
        expect(parsePositionals(['ja-JP', 'ko-KR', '-quick'])).toEqual([
            'ja-JP',
            'ko-KR',
        ]);
    });

    // This used to make `--jobs` the focal locale and translate nothing.
    test('a --option is an error, not a locale', () => {
        expect(parsePositionals(['--jobs', '2', 'zh-CN'])).toMatch(/--jobs/);
    });
});

describe('localePrefixMatches', () => {
    test('exact and descendant match; sibling-with-shared-prefix does not', () => {
        expect(localePrefixMatches('output.Phrase', 'output.Phrase')).toBe(
            true,
        );
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
