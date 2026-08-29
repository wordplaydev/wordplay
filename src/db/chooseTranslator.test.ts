import { stringToLocale } from '@locale/Locale';
import { expect, test } from 'vitest';
import chooseTranslator, { type TranslationBackend } from './chooseTranslator';
import type { RawTranslator } from './translateMarkup';

function locale(tag: string) {
    const parsed = stringToLocale(tag);
    if (parsed === undefined) throw new Error(`bad locale ${tag}`);
    return parsed;
}
const en = locale('en-US');
const es = locale('es-ES');

/** A backend that can't serve this pair at all. */
const absent: RawTranslator = async () => null;

test('the device answers, and we never pay for it', async () => {
    const asked: string[][] = [];
    const cloud: RawTranslator = async (texts) => {
        asked.push([...texts]);
        return texts;
    };
    const backends: TranslationBackend[] = [];
    const result = await chooseTranslator(
        async (texts) => texts.map((t) => `«${t}»`),
        cloud,
        (backend) => backends.push(backend),
    )(['a'], en, es);

    expect(result).toEqual(['«a»']);
    expect(asked).toHaveLength(0);
    expect(backends).toEqual(['device']);
});

test('a pair the device cannot do goes to the network, whole', async () => {
    const asked: string[][] = [];
    const backends: TranslationBackend[] = [];
    const result = await chooseTranslator(
        absent,
        async (texts) => {
            asked.push([...texts]);
            return texts.map((t) => `«${t}»`);
        },
        (backend) => backends.push(backend),
    )(['a', 'b'], en, es);

    expect(result).toEqual(['«a»', '«b»']);
    expect(asked).toEqual([['a', 'b']]);
    expect(backends).toEqual(['cloud']);
});

test('only what the device refused is bought, and order survives the merge', async () => {
    // Spending a creator's daily budget on the whole batch because three
    // sentences failed is the wrong trade in both directions.
    const asked: string[][] = [];
    const result = await chooseTranslator(
        async (texts) => texts.map((t) => (t === 'b' ? undefined : `«${t}»`)),
        async (texts) => {
            asked.push([...texts]);
            return texts.map((t) => `[${t}]`);
        },
    )(['a', 'b', 'c'], en, es);

    expect(asked).toEqual([['b']]);
    expect(result).toEqual(['«a»', '[b]', '«c»']);
});

test('a network failure leaves what the device did manage', async () => {
    const result = await chooseTranslator(
        async (texts) => texts.map((t) => (t === 'b' ? undefined : `«${t}»`)),
        absent,
    )(['a', 'b'], en, es);
    expect(result).toEqual(['«a»', undefined]);
});
