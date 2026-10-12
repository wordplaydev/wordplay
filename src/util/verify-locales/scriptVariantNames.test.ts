import { describe, expect, test } from 'vitest';
import {
    namesNeedTranslation,
    translateNames,
} from '#util/verify-locales/scriptVariantNames.ts';

describe('script-variant CLDR names', () => {
    test('only a locale naming its script needs its names translated', () => {
        expect(namesNeedTranslation('ur-Latn-PK')).toBe(true);
        expect(namesNeedTranslation('ur-PK')).toBe(false);
        expect(namesNeedTranslation('zh-TW')).toBe(false);
    });

    test('earlier translations are kept and only new names are bought', async () => {
        const asked: string[][] = [];
        const result = await translateNames(
            ['January', 'February', 'March', 'January'],
            ['Janwari', 'February', undefined, undefined],
            async (names) => {
                asked.push(names);
                return names.map((name) => `~${name}`);
            },
        );
        // Deduplicated, and never the one already translated.
        expect(asked).toEqual([['February', 'March', 'January']]);
        expect(result).toEqual(['Janwari', '~February', '~March', '~January']);
    });

    test('without a translator nothing regresses and the rest stay English', async () => {
        expect(
            await translateNames(
                ['January', 'February'],
                ['Janwari', undefined],
                undefined,
            ),
        ).toEqual(['Janwari', 'February']);
    });

    test('a failed or capped translation leaves the English for next time', async () => {
        expect(
            await translateNames(
                ['a', 'b', 'c'],
                [],
                async (names) =>
                    names.map((name) =>
                        name === 'a' ? null : name.toUpperCase(),
                    ),
                2,
            ),
        ).toEqual(['a', 'B', 'c']);
    });
});
