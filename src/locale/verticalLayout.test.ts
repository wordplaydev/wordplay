import { describe, expect, test } from 'vitest';
import {
    getLanguageLayout,
    getLanguageVerticalLayout,
} from '@locale/LanguageCode';
import {
    resolveWritingLayout,
    Scripts,
    type ScriptMetadata,
} from '@locale/Scripts';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import type LanguageCode from '@locale/LanguageCode';

/** A Locales preferring the given languages, which is all getVerticalLayout
 *  reads. Everything else stays en-US. */
function preferring(...languages: LanguageCode[]) {
    return new Locales(
        concretize,
        languages.map((language) => ({ ...DefaultLocale, language })),
        DefaultLocale,
    );
}

describe('getVerticalLayout', () => {
    test('any chosen locale unlocks it, not just the primary', () => {
        // Someone writing in both English and Japanese should still get the
        // choice — the question #220 left open.
        expect(preferring('en', 'ja').getVerticalLayout()).toBe('vertical-rl');
        expect(preferring('ja', 'en').getVerticalLayout()).toBe('vertical-rl');
    });

    test('no vertical locale leaves it locked', () => {
        expect(
            preferring('en', 'es', 'ar').getVerticalLayout(),
        ).toBeUndefined();
    });
});

describe('the vertical layout a script is set in', () => {
    test('CJK is set vertically right-to-left, but reads horizontally by default', () => {
        // The distinction the whole gate rests on: modern CJK reads across the
        // page, so `auto` must not turn it vertical — but a vertical setting is
        // meaningful to someone who reads it, which is what unlocks the control.
        for (const code of ['ja', 'ko', 'zh'] as const) {
            expect(getLanguageVerticalLayout(code)).toBe('vertical-rl');
            expect(getLanguageLayout(code)).toBe('horizontal-tb');
        }
    });

    test('Latin-script languages have no vertical layout', () => {
        for (const code of ['en', 'es', 'fr', 'de'] as const)
            expect(getLanguageVerticalLayout(code)).toBeUndefined();
    });

    test('right-to-left languages have no vertical layout', () => {
        // Arabic and Hebrew mirror; they do not run down the page.
        for (const code of ['ar', 'he'] as const)
            expect(getLanguageVerticalLayout(code)).toBeUndefined();
    });

    test('a script never claims the vertical layout it is not set in', () => {
        // The bug this replaces: a boolean flag offered a Japanese reader
        // vertical-lr, which is Mongolian's direction and which nothing they
        // read is ever set in.
        for (const [code, entry] of Object.entries(Scripts)) {
            // Annotated because Scripts is declared with `satisfies`, so each
            // entry keeps its literal type and an optional field is absent from
            // the ones that don't set it.
            const script: ScriptMetadata = entry;
            const vertical = script.verticalLayout;
            if (vertical !== undefined)
                expect({ code, vertical }).toEqual({
                    code,
                    vertical: ['Mong', 'Phag'].includes(code)
                        ? 'vertical-lr'
                        : 'vertical-rl',
                });
        }
    });

    test('a script whose default layout is vertical also declares one', () => {
        // Otherwise a locale could resolve `auto` to vertical while the control
        // that undoes it stays hidden — an interface with no way back.
        for (const [code, entry] of Object.entries(Scripts)) {
            const script: ScriptMetadata = entry;
            if (script.layout !== 'horizontal-tb')
                expect({ code, declared: script.verticalLayout }).toEqual({
                    code,
                    declared: script.layout,
                });
        }
    });
});

describe('resolveWritingLayout', () => {
    test('auto follows the locale', () => {
        expect(
            resolveWritingLayout('auto', 'horizontal-tb', 'vertical-rl'),
        ).toBe('horizontal-tb');
        expect(resolveWritingLayout('auto', 'vertical-lr', 'vertical-lr')).toBe(
            'vertical-lr',
        );
    });

    test('an explicit choice wins over the locale', () => {
        expect(
            resolveWritingLayout('vertical-rl', 'horizontal-tb', 'vertical-rl'),
        ).toBe('vertical-rl');
    });

    test('a vertical choice resolves to the one the reader actually uses', () => {
        // A stored vertical-lr from before the control narrowed, or carried over
        // from another locale, should still mean "vertical" to a Japanese
        // reader — in the direction Japanese is set.
        expect(
            resolveWritingLayout('vertical-lr', 'horizontal-tb', 'vertical-rl'),
        ).toBe('vertical-rl');
    });

    test('a closed gate resolves horizontal whatever was chosen', () => {
        // Someone who picks vertical and later drops the locale that offered the
        // choice would otherwise be left with a vertical interface and no
        // control to undo it.
        for (const choice of [
            'vertical-rl',
            'vertical-lr',
            'auto',
            'horizontal-tb',
        ] as const)
            expect(
                resolveWritingLayout(choice, 'horizontal-tb', undefined),
            ).toBe('horizontal-tb');
    });

    test('the stored choice survives a closed gate', () => {
        // Resolution is pure, so nothing it does can change what was stored:
        // re-adding the locale restores the choice.
        const choice = 'vertical-rl';
        resolveWritingLayout(choice, 'horizontal-tb', undefined);
        expect(
            resolveWritingLayout(choice, 'horizontal-tb', 'vertical-rl'),
        ).toBe('vertical-rl');
    });
});
