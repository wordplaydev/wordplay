import type { Page } from '@playwright/test';

/**
 * Simulate "the cloud is unreachable" for the browser page by aborting only its
 * requests to the Firestore emulator (localhost:8080). The app shell
 * (127.0.0.1:5002) and the auth emulator stay reachable, so the page can still
 * reload mid-test (there's no service worker to serve the shell offline). The
 * test-side admin SDK is a separate Node process and is unaffected, so cloud
 * assertions still see the truth.
 */
const FIRESTORE = /localhost:8080/;
const abort = (route: { abort: () => void }) => route.abort();

export async function cutFirestore(page: Page): Promise<void> {
    await page.route(FIRESTORE, abort);
}

export async function restoreFirestore(page: Page): Promise<void> {
    await page.unroute(FIRESTORE, abort);
}

/**
 * Read every key in the local durable `dirty` table (WordplayDexie v10) from the
 * page's IndexedDB. Keys are `${domain}:${id}`.
 */
export async function readDirtyKeys(page: Page): Promise<string[]> {
    return page.evaluate(
        () =>
            new Promise<string[]>((resolve) => {
                const open = indexedDB.open('wordplay');
                open.onerror = () => resolve([]);
                open.onsuccess = () => {
                    const db = open.result;
                    if (!db.objectStoreNames.contains('dirty')) {
                        resolve([]);
                        return;
                    }
                    const all = db
                        .transaction('dirty', 'readonly')
                        .objectStore('dirty')
                        .getAll();
                    all.onerror = () => resolve([]);
                    all.onsuccess = () =>
                        resolve(
                            (all.result as { key: string }[]).map((r) => r.key),
                        );
                };
            }),
    );
}

/**
 * Wait until the durable `dirty` table contains the given key. Pass a full
 * `domain:id` key for an exact match, or a trailing-colon prefix like `howtos:`
 * to match any id in that domain (used when the id is generated client-side).
 *
 * This replaces fixed sleeps before reloading offline: an edit's markDirty write
 * is debounced and fire-and-forget, so a fixed wait is browser-timing-dependent
 * (it flaked on Firefox). Polling until the row is actually durable makes the
 * "edit survived to the dirty table" precondition deterministic.
 */
export async function waitForDirty(
    page: Page,
    keyOrPrefix: string,
    timeout = 15000,
): Promise<void> {
    const isPrefix = keyOrPrefix.endsWith(':');
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const keys = await readDirtyKeys(page);
        if (
            keys.some((k) =>
                isPrefix ? k.startsWith(keyOrPrefix) : k === keyOrPrefix,
            )
        )
            return;
        await page.waitForTimeout(100);
    }
    throw new Error(
        `dirty key "${keyOrPrefix}" never appeared within ${timeout}ms`,
    );
}
