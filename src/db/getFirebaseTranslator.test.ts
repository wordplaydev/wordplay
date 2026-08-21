import { stringToLocale } from '@locale/Locale';
import type { Functions } from 'firebase/functions';
import { beforeEach, expect, test, vi } from 'vitest';

/** Each call's `texts`, so a test can see how the work was split up. */
const requests: string[][] = [];
/** What the next call should do, in order. */
let responses: ('ok' | 'null' | 'exhausted')[] = [];

vi.mock('firebase/functions', () => ({
    httpsCallable: () => async (data: { texts: string[] }) => {
        requests.push(data.texts);
        const response = responses.shift() ?? 'ok';
        if (response === 'exhausted')
            throw { code: 'functions/resource-exhausted' };
        return {
            data:
                response === 'null'
                    ? null
                    : data.texts.map((text) => `«${text}»`),
        };
    },
}));

const { default: getFirebaseTranslator } =
    await import('@db/getFirebaseTranslator');
const { budget, resetTranslationRefusal } =
    await import('@db/translationBudget.svelte');

const en = stringToLocale('en-US');
const es = stringToLocale('es-ES');

/** A stand-in for the Functions instance; the callable is mocked above. */
const functions = {} as unknown as Functions;

beforeEach(() => {
    requests.length = 0;
    responses = [];
    resetTranslationRefusal();
    budget.used = 0;
    budget.limit = 10_000;
});

test('work is split into several requests rather than one', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const translate = getFirebaseTranslator(functions);
    // 60 strings against a 25-per-request cap.
    const texts = Array.from({ length: 60 }, (_, index) => `text ${index}`);

    const result = await translate(texts, en, es);

    expect(requests.length).toBe(3);
    expect(requests.flat()).toEqual(texts);
    expect(result?.length).toBe(60);
});

test('one failed request costs only its own strings', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const translate = getFirebaseTranslator(functions);
    const texts = Array.from({ length: 60 }, (_, index) => `text ${index}`);
    responses = ['ok', 'null', 'ok'];

    const result = await translate(texts, en, es);

    // The middle chunk's strings keep their source; the rest translate.
    expect(result?.[0]).toBe('«text 0»');
    expect(result?.[30]).toBeUndefined();
    expect(result?.[59]).toBe('«text 59»');
});

test('a wholly failed translation is null', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const translate = getFirebaseTranslator(functions);
    responses = ['null', 'null'];

    const result = await translate(
        Array.from({ length: 30 }, (_, index) => `text ${index}`),
        en,
        es,
    );

    expect(result).toBeNull();
});

test('running out of budget stops asking, and says why', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const translate = getFirebaseTranslator(functions);
    const texts = Array.from({ length: 75 }, (_, index) => `text ${index}`);
    responses = ['ok', 'exhausted', 'ok'];

    const result = await translate(texts, en, es);

    // The third request is never made: the budget won't refill mid-translation.
    expect(requests.length).toBe(2);
    expect(budget.refusal).toBe('over-budget');
    // What was paid for is kept, and the rest keep their source.
    expect(result?.[0]).toBe('«text 0»');
    expect(result?.length).toBe(75);
    expect(result?.[74]).toBeUndefined();
});

test('progress counts up to the total', async () => {
    if (en === undefined || es === undefined) throw new Error('bad locale');
    const updates: { done: number; total: number }[] = [];
    const translate = getFirebaseTranslator(functions, {
        progress: (progress) => updates.push(progress),
    });

    await translate(
        Array.from({ length: 60 }, (_, index) => `text ${index}`),
        en,
        es,
    );

    expect(updates.map((u) => u.done)).toEqual([25, 50, 60]);
    expect(updates.every((u) => u.total === 60)).toBe(true);
});
