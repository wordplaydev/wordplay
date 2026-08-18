import { describe, expect, test } from 'vitest';
import shouldPromptForLocale, { type LocalePromptState } from './localePrompt';

/** A first-time, signed-out visitor on a real, locale-less route: the one case that
 *  should see the prompt. Each test below breaks exactly one condition. */
const FirstVisit: LocalePromptState = {
    urlLocale: undefined,
    routeId: '/[[locale]]',
    localesPersisted: false,
    asked: false,
    authAttempted: true,
    user: null,
    interacting: false,
};

describe('shouldPromptForLocale', () => {
    test('greets a first-time signed-out visitor', () => {
        expect(shouldPromptForLocale(FirstVisit)).toBe(true);
    });

    test('stays quiet when the URL already names a language', () => {
        expect(
            shouldPromptForLocale({ ...FirstVisit, urlLocale: 'es-MX' }),
        ).toBe(false);
        // Including English, which is what every e2e spec navigates to.
        expect(
            shouldPromptForLocale({ ...FirstVisit, urlLocale: 'en-US' }),
        ).toBe(false);
    });

    test('stays quiet when no route matched, so a 404 gets no modal', () => {
        expect(shouldPromptForLocale({ ...FirstVisit, routeId: null })).toBe(
            false,
        );
    });

    test('stays quiet once a language has been stored', () => {
        expect(
            shouldPromptForLocale({ ...FirstVisit, localesPersisted: true }),
        ).toBe(false);
    });

    test('stays quiet once asked, so dismissing it sticks', () => {
        expect(shouldPromptForLocale({ ...FirstVisit, asked: true })).toBe(
            false,
        );
    });

    test('waits for authentication to resolve', () => {
        expect(
            shouldPromptForLocale({
                ...FirstVisit,
                authAttempted: false,
                user: undefined,
            }),
        ).toBe(false);
    });

    test('stays quiet for a signed-in creator', () => {
        expect(
            shouldPromptForLocale({ ...FirstVisit, user: { uid: 'abc' } }),
        ).toBe(false);
    });

    test('stays quiet when auth resolved to unknown rather than signed out', () => {
        // authAttempted is also set when the auth SDK fails to load or isn't
        // configured, leaving `user` undefined. Interrupting a signed-in user whose
        // auth chunk was blocked is worse than not asking an anonymous one.
        expect(shouldPromptForLocale({ ...FirstVisit, user: undefined })).toBe(
            false,
        );
    });

    test('stays quiet once the reader is interacting', () => {
        expect(
            shouldPromptForLocale({ ...FirstVisit, interacting: true }),
        ).toBe(false);
    });
});
