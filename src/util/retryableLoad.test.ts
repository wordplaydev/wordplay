import { expect, test, vi } from 'vitest';
import retryableLoad from './retryableLoad';

test('a successful load runs once, however many callers ask', async () => {
    const load = vi.fn(async () => 'chunk');
    const once = retryableLoad(load);

    expect(await Promise.all([once(), once(), once()])).toEqual([
        'chunk',
        'chunk',
        'chunk',
    ]);
    expect(load).toHaveBeenCalledTimes(1);
});

test('a failed load is not cached, so the next caller retries', async () => {
    // The bug this guards: `promise ??= import(…)` caches the rejected promise,
    // so one failed chunk fetch breaks the feature for the life of the tab.
    let attempts = 0;
    const load = vi.fn(async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('Load failed');
        return 'chunk';
    });
    const once = retryableLoad(load);

    await expect(once()).rejects.toThrow('Load failed');
    expect(await once()).toBe('chunk');
    expect(load).toHaveBeenCalledTimes(2);

    // And the retry's success is cached like any other.
    expect(await once()).toBe('chunk');
    expect(load).toHaveBeenCalledTimes(2);
});

test('callers waiting on one failing load all see the failure', async () => {
    const load = vi.fn(async () => {
        throw new Error('Load failed');
    });
    const once = retryableLoad(load);

    const [first, second] = [once(), once()];
    await expect(first).rejects.toThrow('Load failed');
    await expect(second).rejects.toThrow('Load failed');
    expect(load).toHaveBeenCalledTimes(1);
});
