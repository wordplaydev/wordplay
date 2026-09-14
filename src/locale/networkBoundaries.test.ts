import DefaultLocale from '@locale/DefaultLocale';
import { getLocale } from '@locale/getLocale';
import { isLocaleText } from '@locale/isLocaleText';
import { UpdatesBundleSchema } from '@locale/UpdatesBundle';
import { afterEach, expect, test, vi } from 'vitest';

/**
 * Two reads used to trust what came back over the network: a locale file was
 * asserted to be a `LocaleText` and an updates bundle to be an `UpdatesBundle`.
 * A hosting rewrite answering an HTML error page with a 200 is the ordinary way
 * that goes wrong, and the result was an undefined deep inside a page rather
 * than a locale that failed to load.
 */

afterEach(() => vi.unstubAllGlobals());

function stubFetch(status: number, json: () => Promise<unknown>) {
    vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve({ status, json })),
    );
}

test('a locale file that is not one is refused rather than read', async () => {
    // An HTML error page served with a 200 is the ordinary failure; the rest
    // are JSON that is simply not a locale.
    const bodies: unknown[] = [
        {},
        [],
        null,
        'a string',
        // A file truncated after its first few keys: `language` is there, the
        // tree the interface reads is not.
        { language: 'es', regions: ['MX'] },
    ];
    for (const body of bodies) {
        stubFetch(200, () => Promise.resolve(body));
        expect(await getLocale('es')).toBeUndefined();
    }
    // An HTML body does not parse as JSON at all.
    stubFetch(200, () => Promise.reject(new Error('not JSON')));
    await expect(getLocale('es')).rejects.toThrow();
});

test('a real locale file is read', async () => {
    stubFetch(200, () => Promise.resolve(DefaultLocale));
    expect(await getLocale('en')).toBeDefined();
    expect(isLocaleText(DefaultLocale)).toBe(true);
});

test('an updates bundle that is not one is refused', () => {
    const bodies: unknown[] = [
        '<!doctype html><title>Not found</title>',
        {},
        [],
        null,
        // Right at the top, wrong underneath: `updates` is there but its
        // entries are missing the sections the page renders.
        { format: 1, updates: [{ version: '1.0', date: null }] },
    ];
    for (const body of bodies)
        expect(UpdatesBundleSchema.safeParse(body).success).toBe(false);
});

test('an empty but well-formed bundle is accepted', () => {
    expect(
        UpdatesBundleSchema.safeParse({ format: 1, updates: [] }).success,
    ).toBe(true);
});
