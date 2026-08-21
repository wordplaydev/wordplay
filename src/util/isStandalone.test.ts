import { afterEach, expect, test, vi } from 'vitest';
import isStandalone from './isStandalone';

/** Stand in for `window`, since these tests run in the node environment where
 *  there is none. `matches` is true only for the given display modes. */
function stubWindow(options: { modes?: string[]; standalone?: boolean }) {
    vi.stubGlobal('window', {
        navigator:
            options.standalone === undefined
                ? {}
                : { standalone: options.standalone },
        matchMedia: (query: string) => ({
            matches: (options.modes ?? []).some((mode) =>
                query.includes(`display-mode: ${mode}`),
            ),
        }),
    });
}

afterEach(() => vi.unstubAllGlobals());

test('there is no window during prerender, so nothing is standalone', () => {
    expect(isStandalone()).toBe(false);
});

test.each([
    ['standalone', true],
    ['minimal-ui', true],
    ['fullscreen', true],
    ['browser', false],
])('display-mode %s reads as installed: %s', (mode, expected) => {
    stubWindow({ modes: [mode] });
    expect(isStandalone()).toBe(expected);
});

test("iOS's navigator.standalone counts, since older iPads have no display-mode", () => {
    // No display mode matches, so only the legacy property can decide this.
    stubWindow({ modes: [], standalone: false });
    expect(isStandalone()).toBe(false);

    stubWindow({ modes: [], standalone: true });
    expect(isStandalone()).toBe(true);
});

test('a window without matchMedia is not standalone rather than a crash', () => {
    vi.stubGlobal('window', { navigator: {} });
    expect(isStandalone()).toBe(false);
});
