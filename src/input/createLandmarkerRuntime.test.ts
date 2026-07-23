import { fetchModel } from '@input/createLandmarkerRuntime';
import { afterEach, expect, test, vi } from 'vitest';

/** A Response whose body streams `chunks`, with an optional Content-Length. */
function streamingResponse(chunks: Uint8Array[], total: number | undefined) {
    let i = 0;
    const body = {
        getReader() {
            return {
                read: () =>
                    Promise.resolve(
                        i < chunks.length
                            ? { done: false, value: chunks[i++] }
                            : { done: true, value: undefined },
                    ),
            };
        },
    };
    return {
        ok: true,
        body,
        headers: {
            get: (name: string) =>
                name === 'Content-Length' && total !== undefined
                    ? String(total)
                    : null,
        },
    };
}

afterEach(() => vi.unstubAllGlobals());

test('fetchModel assembles the bytes and reports monotonic progress to 1', async () => {
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];
    vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(streamingResponse(chunks, 5))),
    );

    const progress: (number | undefined)[] = [];
    const bytes = await fetchModel('https://example.test/a.task', (p) =>
        progress.push(p),
    );

    expect([...bytes]).toEqual([1, 2, 3, 4, 5]);
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(1);
    // Non-decreasing.
    for (let i = 1; i < progress.length; i++)
        expect(progress[i]!).toBeGreaterThanOrEqual(progress[i - 1]!);
});

test('fetchModel reports indeterminate progress when Content-Length is absent', async () => {
    vi.stubGlobal(
        'fetch',
        vi.fn(() =>
            Promise.resolve(
                streamingResponse([new Uint8Array([9])], undefined),
            ),
        ),
    );

    const progress: (number | undefined)[] = [];
    await fetchModel('https://example.test/b.task', (p) => progress.push(p));

    // Every mid-download tick is undefined; only the final call is 1.
    expect(progress.slice(0, -1).every((p) => p === undefined)).toBe(true);
    expect(progress.at(-1)).toBe(1);
});

test('fetchModel caches by URL: a second call does not re-fetch', async () => {
    const fetchMock = vi.fn(() =>
        Promise.resolve(streamingResponse([new Uint8Array([7])], 1)),
    );
    vi.stubGlobal('fetch', fetchMock);

    const url = 'https://example.test/cached.task';
    await fetchModel(url, () => {});
    const second: (number | undefined)[] = [];
    await fetchModel(url, (p) => second.push(p));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // A cache hit jumps straight to done.
    expect(second).toEqual([1]);
});
