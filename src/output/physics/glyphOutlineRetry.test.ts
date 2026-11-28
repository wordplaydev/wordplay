import { expect, test } from 'vitest';
import { NetworkRetryDelaysMs } from '#basis/faces/Fonts.ts';
import {
    getGlyphOutline,
    isGlyphOutlinePending,
    loadGlyphOutline,
    outlineKey,
    unreachableGlyphOutlines,
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
    const gate = new Promise<void>((resolve) => (release = resolve));
    const load = loadGlyphOutline(
        'retry-ok',
        'U',
        'Test',
        400,
        false,
        shape,
        () => gate,
    );
    // Waiting to retry: physics should still be holding for it.
    await Promise.resolve();
    expect(isGlyphOutlinePending('retry-ok')).toBe(true);
    release();
    await load;
    expect(attempts()).toBe(2);
    expect(isGlyphOutlinePending('retry-ok')).toBe(false);
});

test('a connection that never comes back gives up, and says so', async () => {
    const before = unreachableGlyphOutlines();
    const { shape, attempts } = scripted([]);
    const { wait, waited } = instant();
    await loadGlyphOutline('retry-never', 'U', 'Test', 400, false, shape, wait);
    expect(attempts()).toBe(NetworkRetryDelaysMs.length + 1);
    expect(waited).toEqual(NetworkRetryDelaysMs);
    expect(isGlyphOutlinePending('retry-never')).toBe(false);
    expect(unreachableGlyphOutlines()).toBe(before + 1);
});

test('a file that cannot be read is not retried', async () => {
    const before = unreachableGlyphOutlines();
    const { shape, attempts } = scripted(['unreadable']);
    const { wait, waited } = instant();
    await loadGlyphOutline('retry-bad', 'U', 'Test', 400, false, shape, wait);
    expect(attempts()).toBe(1);
    expect(waited).toEqual([]);
    expect(unreachableGlyphOutlines()).toBe(before);
});

test('asking for an outline makes it pending at once', () => {
    // No browser here, so the load resolves to nothing, but not synchronously.
    expect(getGlyphOutline('Q', 'Noto Sans', 400, false)).toBeUndefined();
    expect(
        isGlyphOutlinePending(outlineKey('Q', 'Noto Sans', 400, false)),
    ).toBe(true);
});
