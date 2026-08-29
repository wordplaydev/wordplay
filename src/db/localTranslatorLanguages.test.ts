import { stringToLocale } from '@locale/Locale';
import { beforeEach, expect, test } from 'vitest';
import {
    findLocalTranslationPair,
    forgetLocalTranslationAvailability,
    localTranslationTags,
} from './localTranslatorLanguages';

function locale(tag: string) {
    const parsed = stringToLocale(tag);
    if (parsed === undefined) throw new Error(`bad locale ${tag}`);
    return parsed;
}

beforeEach(() => forgetLocalTranslationAvailability());

test('a locale offers its most specific tag first', () => {
    expect(localTranslationTags(locale('en-US'))).toEqual(['en-US', 'en']);
    expect(localTranslationTags(locale('pt-PT'))).toEqual(['pt-PT', 'pt']);
});

test('Traditional Chinese is asked for by script, not by region', () => {
    // Best-fit matching would answer `zh` for `zh-TW`, which is Simplified —
    // the wrong script for Taiwan, Hong Kong, and Macau.
    expect(localTranslationTags(locale('zh-TW'))[0]).toBe('zh-Hant');
    expect(localTranslationTags(locale('zh-CN'))).not.toContain('zh-Hant');
});

test('a locale with several regions never offers them all', () => {
    // `localeToString` would give `ta-IN-LK-SG`, which is not a language tag at
    // all — and a malformed tag makes the API throw rather than answer.
    for (const tag of localTranslationTags(locale('ta-IN-LK-SG')))
        expect(tag.split('-').length).toBeLessThanOrEqual(2);
});

test('a multilingual locale offers its primary language', () => {
    // `localeToString` joins these with `_`, which is not a language tag.
    for (const tag of localTranslationTags(locale('es_en-MX')))
        expect(tag).not.toContain('_');
});

/** Answers a fixed table, and counts how many times it was asked. */
function api(
    table: Record<string, TranslatorAvailability>,
    asked: string[] = [],
): TranslatorFactory {
    return {
        availability: async ({ sourceLanguage, targetLanguage }) => {
            const key = `${sourceLanguage}>${targetLanguage}`;
            asked.push(key);
            return table[key] ?? 'unavailable';
        },
        create: async () => {
            throw new Error('not used');
        },
    };
}

test('an available pair beats a downloadable one', async () => {
    const pair = await findLocalTranslationPair(
        api({ 'en-US>es-MX': 'downloadable', 'en>es-MX': 'available' }),
        locale('en-US'),
        locale('es-MX'),
        true,
    );
    expect(pair).toEqual({ source: 'en', target: 'es-MX' });
});

test('a pair that would need downloading is refused unless asked for', async () => {
    // A multi-hundred-megabyte download on a school Chromebook is slower to a
    // first result than the network call it would replace, so falling through
    // is the better default and downloading is an explicit choice.
    const table: Record<string, TranslatorAvailability> = {
        'en>es': 'downloadable',
    };
    expect(
        await findLocalTranslationPair(
            api(table),
            locale('en-US'),
            locale('es-ES'),
            false,
        ),
    ).toBeUndefined();
    expect(
        await findLocalTranslationPair(
            api(table),
            locale('en-US'),
            locale('es-ES'),
            true,
        ),
    ).toEqual({ source: 'en', target: 'es' });
});

test('translating a language into itself is not this backend’s job', async () => {
    // en-US and en-GB both narrow to `en`; the network backend can honor that
    // request and this one cannot.
    expect(
        await findLocalTranslationPair(
            api({ 'en>en': 'available' }),
            locale('en-US'),
            locale('en-GB'),
            true,
        ),
    ).toBeUndefined();
});

test('a pair is asked about once, however often it comes up', async () => {
    // Availability consults the model registry, and a chat asks for every batch
    // of every message — uncached, one translation becomes dozens of probes.
    const asked: string[] = [];
    const backend = api({ 'en>es': 'available' }, asked);
    await findLocalTranslationPair(
        backend,
        locale('en-US'),
        locale('es-ES'),
        false,
    );
    const first = asked.length;
    await findLocalTranslationPair(
        backend,
        locale('en-US'),
        locale('es-ES'),
        false,
    );
    expect(asked.length).toBe(first);
});

test('a tag the browser rejects is a pair it cannot do, not a crash', async () => {
    const throwing: TranslatorFactory = {
        availability: async () => {
            throw new TypeError('bad tag');
        },
        create: async () => {
            throw new Error('not used');
        },
    };
    expect(
        await findLocalTranslationPair(
            throwing,
            locale('en-US'),
            locale('es-ES'),
            true,
        ),
    ).toBeUndefined();
});
