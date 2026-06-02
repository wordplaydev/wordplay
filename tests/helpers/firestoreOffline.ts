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
                    // Close the connection in every path: a leaked handle per
                    // poll piles up dozens of open connections that contend with
                    // the app's own Dexie writes (e.g. markDirty).
                    if (!db.objectStoreNames.contains('dirty')) {
                        db.close();
                        resolve([]);
                        return;
                    }
                    const all = db
                        .transaction('dirty', 'readonly')
                        .objectStore('dirty')
                        .getAll();
                    all.onerror = () => {
                        db.close();
                        resolve([]);
                    };
                    all.onsuccess = () => {
                        const keys = (all.result as { key: string }[]).map(
                            (r) => r.key,
                        );
                        db.close();
                        resolve(keys);
                    };
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

/**
 * Wait until the cached (Dexie) project has the given name. `waitForDirty`
 * alone is insufficient before a reload: persist() writes the project cache
 * (saveProjects) and the dirty row (markDirty) as *separate* async Dexie
 * writes, and on slow IndexedDB (Firefox CI) the dirty row can land first — so
 * a reload then re-hydrates the pre-edit project. Gating on the cached name
 * guarantees the edit is durable before we reload.
 */
export async function waitForCachedProjectName(
    page: Page,
    projectId: string,
    name: string,
    timeout = 15000,
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const cached = await page.evaluate(
            (id) =>
                new Promise<string | null>((resolve) => {
                    const open = indexedDB.open('wordplay');
                    open.onerror = () => resolve(null);
                    open.onsuccess = () => {
                        const db = open.result;
                        // Close in every path; a leaked handle per poll contends
                        // with the app's Dexie writes.
                        if (!db.objectStoreNames.contains('projects')) {
                            db.close();
                            resolve(null);
                            return;
                        }
                        const req = db
                            .transaction('projects', 'readonly')
                            .objectStore('projects')
                            .get(id);
                        req.onerror = () => {
                            db.close();
                            resolve(null);
                        };
                        req.onsuccess = () => {
                            const name =
                                (req.result as { name?: string } | undefined)
                                    ?.name ?? null;
                            db.close();
                            resolve(name);
                        };
                    };
                }),
            projectId,
        );
        if (cached === name) return;
        await page.waitForTimeout(100);
    }
    throw new Error(
        `cached project "${projectId}" name never became "${name}" within ${timeout}ms`,
    );
}
