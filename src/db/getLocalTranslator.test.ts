import { stringToLocale } from '@locale/Locale';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { forgetLocalTranslationAvailability } from './localTranslatorLanguages';
import getLocalTranslator, {
    releaseLocalTranslators,
    supportsLocalTranslation,
} from './getLocalTranslator';

function locale(tag: string) {
    const parsed = stringToLocale(tag);
    if (parsed === undefined) throw new Error(`bad locale ${tag}`);
    return parsed;
}

const en = locale('en-US');
const es = locale('es-ES');

/**
 * The API is stood in for by assigning to `globalThis`, not by `vi.mock`.
 *
 * A mocked module stays mocked for every later file sharing the worker, which
 * is why every mocking file has to be listed in src/util/isolatedTests.ts. A
 * global has the same problem and the same cure — hence the `afterEach`, which
 * is correctness here rather than tidiness.
 */
let created: TranslatorCreateOptions[] = [];
let translated: string[] = [];
let available: Record<string, TranslatorAvailability> = {};
let refuse: (input: string) => boolean = () => false;
let destroyed = 0;

beforeEach(() => {
    created = [];
    translated = [];
    available = { 'en>es': 'available' };
    refuse = () => false;
    destroyed = 0;
    forgetLocalTranslationAvailability();
    globalThis.Translator = {
        availability: async ({ sourceLanguage, targetLanguage }) =>
            available[`${sourceLanguage}>${targetLanguage}`] ?? 'unavailable',
        create: async (options) => {
            created.push(options);
            return {
                translate: async (input: string) => {
                    if (refuse(input)) throw new Error('refused');
                    translated.push(input);
                    return `«${input}»`;
                },
                destroy: () => {
                    destroyed += 1;
                },
            };
        },
    };
});

afterEach(() => {
    releaseLocalTranslators();
    globalThis.Translator = undefined;
    forgetLocalTranslationAvailability();
});

test('there is no local translation without the API', async () => {
    globalThis.Translator = undefined;
    expect(supportsLocalTranslation()).toBe(false);
    expect(await getLocalTranslator()(['hi'], en, es)).toBeNull();
});

test('a pair the browser cannot do falls through rather than failing', async () => {
    // null means "not this backend", never "translation failed" — that is what
    // lets the chooser ask the next one.
    available = {};
    expect(await getLocalTranslator()(['hi'], en, es)).toBeNull();
});

test('a pair it can do translates every string', async () => {
    expect(await getLocalTranslator()(['a', 'b'], en, es)).toEqual([
        '«a»',
        '«b»',
    ]);
});

test('results keep input order even when the model answers out of order', async () => {
    // There is no batch call, so strings go concurrently — and a translator
    // that returned them in completion order would silently reattribute every
    // message in the conversation.
    const finish: (() => void)[] = [];
    globalThis.Translator = {
        availability: async () => 'available',
        create: async () => ({
            translate: (input: string) =>
                new Promise<string>((resolve) =>
                    finish.push(() => resolve(`«${input}»`)),
                ),
            destroy: () => {},
        }),
    };
    const pending = getLocalTranslator()(['a', 'b', 'c'], en, es);
    // Let the workers start, then resolve backwards.
    await new Promise((r) => setTimeout(r, 0));
    for (const resolve of finish.reverse()) resolve();
    expect(await pending).toEqual(['«a»', '«b»', '«c»']);
});

test('one string the model refuses costs only that string', async () => {
    refuse = (input) => input === 'b';
    const result = await getLocalTranslator()(['a', 'b', 'c'], en, es);
    expect(result).toEqual(['«a»', undefined, '«c»']);
});

test('every string refused is a failed batch', async () => {
    refuse = () => true;
    expect(await getLocalTranslator()(['a', 'b'], en, es)).toBeNull();
});

test('progress counts what was done and what kept its own words', async () => {
    // `kept` is counted off a filled array rather than a sparse one: `filter`
    // skips holes, so counting off `new Array(n)` quietly answers zero.
    refuse = (input) => input === 'b';
    const seen: { done: number; total: number; kept: number }[] = [];
    await getLocalTranslator({ progress: (p) => seen.push(p) })(
        ['a', 'b'],
        en,
        es,
    );
    expect(seen[seen.length - 1]).toEqual({ done: 2, total: 2, kept: 1 });
});

test('one model is loaded per pair and reused', async () => {
    const translate = getLocalTranslator();
    await translate(['a'], en, es);
    await translate(['b'], en, es);
    expect(created).toHaveLength(1);
});

test('a create that failed is not remembered as a failure', async () => {
    // Otherwise one missing user gesture is inherited by every later call for
    // the rest of the session.
    let first = true;
    globalThis.Translator = {
        availability: async () => 'available',
        create: async () => {
            if (first) {
                first = false;
                throw new Error('NotAllowedError');
            }
            return {
                translate: async (input: string) => `«${input}»`,
                destroy: () => {},
            };
        },
    };
    const translate = getLocalTranslator();
    expect(await translate(['a'], en, es)).toBeNull();
    expect(await translate(['a'], en, es)).toEqual(['«a»']);
});

test('download progress reaches the caller', async () => {
    globalThis.Translator = {
        availability: async () => 'downloadable',
        create: async (options) => {
            options.monitor?.({
                addEventListener: (_type, listener) =>
                    listener({ loaded: 0.5 }),
            });
            return {
                translate: async (input: string) => `«${input}»`,
                destroy: () => {},
            };
        },
    };
    const loaded: number[] = [];
    await getLocalTranslator({
        allowDownload: true,
        download: (fraction) => loaded.push(fraction),
    })(['a'], en, es);
    expect(loaded).toEqual([0.5]);
});

test('releasing destroys what was loaded', async () => {
    await getLocalTranslator()(['a'], en, es);
    releaseLocalTranslators();
    await new Promise((r) => setTimeout(r, 0));
    expect(destroyed).toBe(1);
});
