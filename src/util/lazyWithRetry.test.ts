import { expect, test, vi } from 'vitest';
import lazyWithRetry from './lazyWithRetry';

test('a successful load is memoized and the loader runs once', async () => {
    const load = vi.fn(() => Promise.resolve('ready'));
    const get = lazyWithRetry(load);
    await expect(get()).resolves.toBe('ready');
    await expect(get()).resolves.toBe('ready');
    expect(load).toHaveBeenCalledTimes(1);
});

test('concurrent callers share one in-flight load', async () => {
    let release: (value: string) => void = () => {};
    const load = vi.fn(
        () =>
            new Promise<string>((resolve) => {
                release = resolve;
            }),
    );
    const get = lazyWithRetry(load);
    const first = get();
    const second = get();
    release('ready');
    await expect(first).resolves.toBe('ready');
    await expect(second).resolves.toBe('ready');
    expect(load).toHaveBeenCalledTimes(1);
});

test('a rejected load is retried on the next call, not replayed', async () => {
    const load = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('chunk fetch failed'))
        .mockResolvedValue('ready');
    const get = lazyWithRetry(load);
    // The rejection reaches the caller...
    await expect(get()).rejects.toThrow('chunk fetch failed');
    // ...but is not memoized: the next call re-invokes the loader.
    await expect(get()).resolves.toBe('ready');
    // And success memoizes as usual.
    await expect(get()).resolves.toBe('ready');
    expect(load).toHaveBeenCalledTimes(2);
});
