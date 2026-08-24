import { describe, expect, test, vi } from 'vitest';

// The module reads SvelteKit's page state, which only exists in a running app.
vi.mock('$app/navigation', () => ({ goto: () => Promise.resolve() }));
const params: { locale?: string } = {};
vi.mock('$app/state', () => ({
    page: {
        get params() {
            return params;
        },
    },
}));

const { localePath, unlocalePath } = await import('@util/localeGoto');

describe('localePath / unlocalePath', () => {
    test('round-trips a path through the current locale', () => {
        params.locale = 'en-US';
        expect(localePath('/guide')).toBe('/en-US/guide');
        expect(unlocalePath('/en-US/guide')).toBe('/guide');
    });

    test('unlocalePath leaves an already-bare path alone', () => {
        // This is the bug it exists for: a stored path that still carried its
        // locale got prefixed again on the way back out, giving
        // `/en-US/en-US/guide`.
        params.locale = 'en-US';
        expect(localePath(unlocalePath('/guide'))).toBe('/en-US/guide');
        expect(localePath(unlocalePath('/en-US/guide'))).toBe('/en-US/guide');
    });

    test("doesn't mistake a path that merely starts with the same letters", () => {
        params.locale = 'en';
        expect(unlocalePath('/energy')).toBe('/energy');
    });

    test('the root stays the root', () => {
        params.locale = 'en-US';
        expect(localePath('/')).toBe('/en-US');
        expect(unlocalePath('/en-US')).toBe('/');
    });

    test('with no locale in the URL, both are the identity', () => {
        delete params.locale;
        expect(localePath('/guide')).toBe('/guide');
        expect(unlocalePath('/guide')).toBe('/guide');
    });
});
