import { afterEach, expect, test, vi } from 'vitest';
import { get } from 'svelte/store';
import {
    FontManager,
    fontsLoadedGeneration,
    NetworkRetryDelaysMs,
} from './Fonts';

/**
 * A FontFace that fails never tries again, so a face whose download dropped
 * once stayed in a fallback face for the session, and its rejection was
 * uncaught. These stub the browser's font API with faces that fail on demand.
 */

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

/** Stub FontFace and document.fonts, failing the first `failures` loads. */
function stubFonts(failures: number) {
    let loads = 0;
    const deleted: unknown[] = [];
    vi.stubGlobal(
        'FontFace',
        class {
            load() {
                loads++;
                return loads <= failures
                    ? Promise.reject(new Error('A network error occurred.'))
                    : Promise.resolve(this);
            }
        },
    );
    vi.stubGlobal('document', {
        fonts: {
            add: () => undefined,
            delete: (face: unknown) => deleted.push(face),
            addEventListener: () => undefined,
        },
    });
    return { loads: () => loads, deleted };
}

const font = {
    name: 'Titan One',
    weight: 400,
    italic: false,
    format: 'woff2',
    range: undefined,
} as const;

test('a dropped font download is retried', async () => {
    vi.useFakeTimers();
    const { loads, deleted } = stubFonts(1);
    const fonts = new FontManager();
    const load = fonts.loadFace('Titan One');
    expect(fonts.isFaceLoading('Titan One')).toBe(true);
    await vi.runAllTimersAsync();
    await load;
    expect(loads()).toBe(2);
    // The failed face is removed so it can't shadow the one that loaded.
    expect(deleted).toHaveLength(1);
    expect(fonts.isFaceLoading('Titan One')).toBe(false);
    expect(fonts.facesLoaded.get('Titan One')).toBe('loaded');
});

test('a font that never loads gives up without throwing', async () => {
    vi.useFakeTimers();
    const { loads } = stubFonts(Infinity);
    const fonts = new FontManager();
    const load = fonts.loadFont(font);
    await vi.runAllTimersAsync();
    await expect(load).resolves.toBe(false);
    expect(loads()).toBe(NetworkRetryDelaysMs.length + 1);
});

test('asking for a face again while it loads starts no second download', async () => {
    vi.useFakeTimers();
    const { loads } = stubFonts(Infinity);
    const fonts = new FontManager();
    // A stage asks on every evaluation.
    const first = fonts.loadFace('Titan One');
    void fonts.loadFace('Titan One');
    await vi.runAllTimersAsync();
    await first;
    expect(loads()).toBe(NetworkRetryDelaysMs.length + 1);
    // And having given up, asking again doesn't start over.
    void fonts.loadFace('Titan One');
    await vi.runAllTimersAsync();
    expect(loads()).toBe(NetworkRetryDelaysMs.length + 1);
});

test('a face that gives up says so, so what waits for it can stop', async () => {
    vi.useFakeTimers();
    stubFonts(Infinity);
    const fonts = new FontManager();
    const generation = get(fontsLoadedGeneration);
    const load = fonts.loadFace('Titan One');
    await vi.runAllTimersAsync();
    await load;
    expect(fonts.facesLoaded.get('Titan One')).toBe('failed');
    expect(get(fontsLoadedGeneration)).toBeGreaterThan(generation);
});

test('coming back online asks again for a face that gave up', async () => {
    vi.useFakeTimers();
    const { loads } = stubFonts(NetworkRetryDelaysMs.length + 1);
    const online: (() => void)[] = [];
    vi.stubGlobal('window', {
        addEventListener: (_: string, handler: () => void) =>
            online.push(handler),
    });
    const fonts = new FontManager();
    await Promise.all([fonts.loadFace('Titan One'), vi.runAllTimersAsync()]);
    expect(fonts.facesLoaded.get('Titan One')).toBe('failed');
    for (const handler of online) handler();
    const again = fonts.loadFace('Titan One');
    await vi.runAllTimersAsync();
    await again;
    expect(loads()).toBe(NetworkRetryDelaysMs.length + 2);
    expect(fonts.facesLoaded.get('Titan One')).toBe('loaded');
});
