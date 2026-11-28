import { get } from 'svelte/store';
import { expect, test, vi } from 'vitest';
import { NetworkRetryDelaysMs } from '#basis/faces/Fonts.ts';
import {
    getGlyphOutline,
    glyphOutlinesGeneration,
    isGlyphOutlinePending,
    isGlyphOutlineUnreachable,
    loadGlyphOutline,
    outlineKey,
    type Shaper,
} from './glyphOutline';

/** A shaper that answers from a script, one answer per attempt. */
function scripted(answers: Awaited<ReturnType<Shaper>>[]) {
    let attempts = 0;
    const shape: Shaper = async () => answers[attempts++] ?? 'connection';
    return { shape, attempts: () => attempts };
}

/** A wait that resolves at once, recording what it was asked for. */
function instant() {
    const waited: number[] = [];
    return {
        wait: async (ms: number) => {
            waited.push(ms);
        },
        waited,
    };
}

test('a dropped connection is retried, and the outline stays pending meanwhile', async () => {
    const { shape, attempts } = scripted(['connection', []]);
    let release = () => {};
    let waiting = false;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const load = loadGlyphOutline(
        'retry-ok',
        'U',
        'Test',
        400,
        false,
        shape,
        () => {
            waiting = true;
            return gate;
        },
    );
    // The first attempt failed and it's waiting to retry: physics should
    // still be holding for it.
    await vi.waitFor(() => expect(waiting).toBe(true));
    expect(isGlyphOutlinePending('retry-ok')).toBe(true);
    release();
    await load;
    expect(attempts()).toBe(2);
    expect(isGlyphOutlinePending('retry-ok')).toBe(false);
});

test('a connection that never comes back gives up, and says so', async () => {
    const { shape, attempts } = scripted([]);
    const { wait, waited } = instant();
    await loadGlyphOutline('retry-never', 'U', 'Test', 400, false, shape, wait);
    expect(attempts()).toBe(NetworkRetryDelaysMs.length + 1);
    expect(waited).toEqual(NetworkRetryDelaysMs);
    expect(isGlyphOutlinePending('retry-never')).toBe(false);
    expect(isGlyphOutlineUnreachable('retry-never')).toBe(true);
});

test('a file that cannot be read is not retried', async () => {
    const { shape, attempts } = scripted(['unreadable']);
    const { wait, waited } = instant();
    await loadGlyphOutline('retry-bad', 'U', 'Test', 400, false, shape, wait);
    expect(attempts()).toBe(1);
    expect(waited).toEqual([]);
    // Nothing to report: it would fail the same way every time.
    expect(isGlyphOutlineUnreachable('retry-bad')).toBe(false);
});

test('asking for an outline makes it pending at once', () => {
    // No browser here, so the load resolves to nothing, but not synchronously.
    expect(getGlyphOutline('Q', 'Noto Sans', 400, false)).toBeUndefined();
    expect(
        isGlyphOutlinePending(outlineKey('Q', 'Noto Sans', 400, false)),
    ).toBe(true);
});

test('coming back online asks again for what gave up', async () => {
    const handlers: (() => void)[] = [];
    vi.stubGlobal('window', {
        addEventListener: (_: string, handler: () => void) =>
            handlers.push(handler),
    });
    const key = 'retry-online';
    const { wait } = instant();
    await loadGlyphOutline(
        key,
        'U',
        'Test',
        400,
        false,
        scripted([]).shape,
        wait,
    );
    expect(isGlyphOutlineUnreachable(key)).toBe(true);
    const generation = get(glyphOutlinesGeneration);
    for (const handler of handlers) handler();
    vi.unstubAllGlobals();
    expect(isGlyphOutlineUnreachable(key)).toBe(false);
    // Bumped, so stages re-sync and their next ask starts a fresh load.
    expect(get(glyphOutlinesGeneration)).toBeGreaterThan(generation);
});
