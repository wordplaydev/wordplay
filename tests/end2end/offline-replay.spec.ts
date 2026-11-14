import type { Page } from '@playwright/test';
import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { createTestCharacter } from '../helpers/createCharacter';
import { joinViaUI } from '../helpers/joinViaUI';
import { waitForDocumentUpdate, getTestDocument } from '../helpers/firestore';
import {
    cutFirestore,
    restoreFirestore,
    waitForDirty,
    waitForCachedProjectName,
} from '../helpers/firestoreOffline';

/**
 * Durable offline → reload → reconnect → replay coverage for the local-first
 * save path. These are the end-to-end guards for the bugs fixed this cycle:
 *  - writes made while the cloud is unreachable are persisted to the durable
 *    `dirty` table (WordplayDexie v10) and replayed after reconnect;
 *  - a doc *created* offline is replayed with a create-capable write (setDoc /
 *    batch.set), not updateDoc — otherwise it 404s forever ("not-found").
 *
 * # Why we block :8080 instead of context.setOffline
 *
 * There's no service worker, so `context.setOffline(true)` would also stop the
 * app shell (port 5002) from loading on reload — and the whole point here is to
 * reload mid-edit. Instead we abort only requests to the Firestore emulator
 * (port 8080), leaving the app origin and the auth emulator reachable. The test-side admin SDK (waitForDocumentUpdate) is a separate Node
 * process and is unaffected, so it still reads the cloud truth.
 *
 * # Why two reloads
 *
 * The first reload (while Firestore is still cut) destroys Firestore's
 * in-memory write queue, so any later replay can only come from our durable
 * `dirty` table — that's the thing under test. After restoring Firestore the
 * second reload runs `startSync`, whose per-domain `flushUnsaved()` determinist-
 * ically replays the dirty docs (navigator.onLine never flipped, so we don't
 * rely on an online/recovery event firing).
 */

test.describe('offline edits replay after reload + reconnect', () => {
    // Multiple reloads + a debounced save + a cloud-poll; comfortably past the
    // default 30s.
    // Generous budget: these do multiple reloads + offline→reconnect cloud
    // round-trips, which are markedly slower on the WebKit nightly runner.
    test.describe.configure({ timeout: 120000 });

    test('a project edited while offline is replayed to the cloud', async ({
        page,
    }) => {
        const projectId = await createTestProject(page);
        // Confirm it exists in the cloud before we go offline.
        await waitForDocumentUpdate(page, 'projects', projectId, (d) => !!d);

        await cutFirestore(page);

        const offlineName = 'Edited While Offline';
        const nameField = page.locator('#project-name');
        await nameField.fill(offlineName);
        await expect(nameField).toHaveValue(offlineName);

        // Wait until persist() has durably recorded BOTH the dirty row AND the
        // edited project in the cache before reloading. saveProjects and
        // markDirty are separate async Dexie writes, and on slow IndexedDB
        // (Firefox CI) the dirty row can land first, so a bare waitForDirty +
        // reload re-hydrates the pre-edit (empty-name) project and the edit is
        // lost. Order matters: wait for the dirty row FIRST (it polls the
        // `dirty` store, which doesn't contend with persist's `projects`
        // write); only then poll the `projects` cache — by which point persist
        // is done, so the poll resolves immediately without starving the
        // in-flight saveProjects write.
        await waitForDirty(page, `projects:${projectId}`);
        await waitForCachedProjectName(page, projectId, offlineName);

        // Reload while still cut: destroys the in-memory write queue; the edit
        // must now survive purely via the Dexie cache + dirty row. The editor
        // re-hydrates from Dexie after reload — Firefox can take noticeably
        // longer than the default 5s, so give the value check room.
        await page.reload();
        await expect(page.locator('#project-name')).toHaveValue(offlineName, {
            timeout: 20000,
        });

        // Reconnect and reload so startSync's flushUnsaved replays from the
        // durable dirty table.
        await restoreFirestore(page);
        await page.reload();

        const updated = await waitForDocumentUpdate(
            page,
            'projects',
            projectId,
            (d) => d?.name === offlineName,
            50000,
        );
        expect(updated?.name).toBe(offlineName);
    });

    test('signing out deletes this device’s copies, unsaved ones included', async ({
        page,
    }) => {
        const projectId = await createTestProject(page);
        await waitForDocumentUpdate(page, 'projects', projectId, (d) => !!d);

        await cutOffFromCloud(page);
        const offlineName = 'Edited Before Signing Out';
        await page.locator('#project-name').fill(offlineName);
        await waitForDirty(page, `projects:${projectId}`);
        await waitForCachedProjectName(page, projectId, offlineName);

        // The profile page says there is unsaved work before the button that
        // deletes it.
        await page.goto('/en-US/profile');
        await expect(page.getByTestId('logout')).toBeVisible({
            timeout: 20000,
        });
        await expect(page.getByText(/aren't saved online yet/)).toBeVisible();
        await page.getByTestId('logout').click();
        await page.getByTestId('logout-confirm').click();
        await page.waitForURL(/\/login$/, { waitUntil: 'domcontentloaded' });

        // Signing out is how someone makes sure nothing of theirs stays on a
        // device, so nothing does: not in the cache, and not set aside.
        await expect
            .poll(() => storedProjectIDs(page, 'projects'))
            .not.toContain(projectId);
        expect(await storedProjectIDs(page, 'setaside')).not.toContain(
            projectId,
        );
    });

    test('a different account signing in sets unsaved work aside for its owner', async ({
        page,
        loggedInUsername,
    }) => {
        const projectId = await createTestProject(page);
        await waitForDocumentUpdate(page, 'projects', projectId, (d) => !!d);

        await cutOffFromCloud(page);
        const offlineName = 'Edited Before The Session Lapsed';
        await page.locator('#project-name').fill(offlineName);
        await waitForDirty(page, `projects:${projectId}`);
        await waitForCachedProjectName(page, projectId, offlineName);

        // The session lapses without a sign-out, as it does on a classroom
        // laptop that goes back in the cart: the account is gone, the device
        // still remembers whose projects it holds.
        await page.evaluate(
            () =>
                new Promise<void>((resolve) => {
                    const request = indexedDB.deleteDatabase(
                        'firebaseLocalStorageDb',
                    );
                    request.onsuccess = () => resolve();
                    request.onerror = () => resolve();
                    request.onblocked = () => resolve();
                }),
        );
        await restoreFirestore(page);

        // Someone else signs in. They must not see the project, and the edit
        // must not be deleted: it exists nowhere else.
        await joinViaUI(page, `next${Date.now().toString(36)}`, 'password');
        await expect
            .poll(() => storedProjectIDs(page, 'setaside'), { timeout: 20000 })
            .toContain(projectId);
        expect(await storedProjectIDs(page, 'projects')).not.toContain(
            projectId,
        );
        await page.goto('/en-US/projects');
        await expect(
            page.locator('[data-testid="addproject"][aria-disabled="false"]'),
        ).toBeVisible({ timeout: 20000 });
        await expect(page.getByText(offlineName)).toHaveCount(0);

        // They sign out, the first person signs back in, and the edit that
        // was held for them reaches the cloud.
        await page.goto('/en-US/profile');
        await page.getByTestId('logout').click();
        await page.getByTestId('logout-confirm').click();
        await page.waitForURL(/\/login$/, { waitUntil: 'domcontentloaded' });
        await page.locator('#login-username-field').fill(loggedInUsername);
        await page.locator('#login-password-field').fill('password');
        await page.getByTestId('login-button').click();
        await page.waitForURL(/\/profile$/, { waitUntil: 'domcontentloaded' });

        const updated = await waitForDocumentUpdate(
            page,
            'projects',
            projectId,
            (d) => d?.name === offlineName,
            50000,
        );
        expect(updated?.name).toBe(offlineName);
        expect(await storedProjectIDs(page, 'setaside')).not.toContain(
            projectId,
        );
    });

    test('a character edited while offline reaches the cloud on reconnect', async ({
        page,
        loggedInUsername,
    }) => {
        // Characters are a last-write-wins (skip-dirty) domain, so this covers
        // the same-session offline→reconnect path: the durable cross-reload
        // replay is proven by the project (CRDT) and chat (create) tests, and
        // the character durable-dirty/markClean behavior by the unit tests. A
        // cross-reload character test would race seedDirty against the
        // reconnecting listener's first snapshot (clobbering the local edit
        // before the dirty set is re-seeded) — a real but rare fresh-load race
        // that a fast emulator makes nondeterministic.
        const characterId = await createTestCharacter(page);
        await waitForDocumentUpdate(
            page,
            'characters',
            characterId,
            (d) => !!d,
        );

        await cutFirestore(page);

        // Spaces on purpose: the editor folds them into one word, since a
        // character's name is an identifier.
        const typed = 'Offline Hero';
        await page.locator('#character-name').fill(typed);
        const expectedName = `${loggedInUsername}/OfflineHero`;

        // Confirm the offline edit is durably tracked as unsaved (markClean
        // hasn't run because the write can't reach the cloud).
        await waitForDirty(page, `characters:${characterId}`);

        // Reconnect: the queued write flushes and the edit reaches the cloud.
        await restoreFirestore(page);

        const updated = await waitForDocumentUpdate(
            page,
            'characters',
            characterId,
            (d) => d?.name === expectedName,
            50000,
        );
        expect(updated?.name).toBe(expectedName);
    });

    test('a chat CREATED while offline is replayed as a create (not-found regression)', async ({
        page,
    }) => {
        // The chat doc id is the project id.
        const projectId = await createTestProject(page);
        // No chat should exist yet.
        expect(await getTestDocument('chats', projectId)).toBeNull();

        await cutFirestore(page);

        // Post the first message — it creates the chat and adds the message,
        // and both writes abort against the cut emulator but mirror locally +
        // mark the chat dirty. There is no separate "start" step: the create is
        // what sending the first message does.
        await page.getByTestId('collaborate-toggle').click();
        const messageEditor = page.locator('#new-message');
        await messageEditor.waitFor();
        await messageEditor.click();
        await page.keyboard.type('Offline hello');
        await page
            .locator(
                'button[aria-label^="send a message to your collaborators"]',
            )
            .click();

        // Wait for the message to land in the local chat before reloading. The
        // create's write never settles against the cut emulator, so the chat
        // reaches the client through its own local mirror a beat later and the
        // message goes in then; reloading before that would throw away the very
        // thing this test is about.
        await expect(page.getByText('Offline hello')).toBeVisible({
            timeout: 30000,
        });

        // Wait until the chat's dirty row is durable before reloading.
        await waitForDirty(page, `chats:${projectId}`);

        // Reload while cut: the in-memory create queue is gone; only the durable
        // dirty row + cached chat remain.
        await page.reload();

        // Reconnect + reload → flushUnsaved replays the never-created chat with
        // setDoc. Pre-fix this used updateDoc and 404'd forever.
        await restoreFirestore(page);
        await page.reload();

        const chat = await waitForDocumentUpdate(
            page,
            'chats',
            projectId,
            (d) =>
                Array.isArray(d?.messages) &&
                d.messages.some(
                    (m: { text?: string }) => m?.text === 'Offline hello',
                ),
            50000,
        );
        expect(chat).not.toBeNull();
        const msg = (chat?.messages as { text: string }[]).find(
            (m) => m.text === 'Offline hello',
        );
        expect(msg).toBeDefined();
    });

    test('a project created online is readable from the local cache while offline', async ({
        page,
    }) => {
        const projectId = await createTestProject(page);
        const cachedName = 'Cached For Offline';
        await page.locator('#project-name').fill(cachedName);
        // Wait until it's mirrored to the cloud.
        await waitForDocumentUpdate(
            page,
            'projects',
            projectId,
            (d) => d?.name === cachedName,
        );

        // The name reaching the cloud does not mean it reached the *cache*, and
        // the cache is what this test is about: persist() writes the project
        // cache and the dirty row as separate async Dexie writes, so on slow
        // IndexedDB the reload below can re-hydrate the pre-edit project. This
        // is the precondition waitForCachedProjectName exists for — without it
        // the reloaded page showed an empty name and this was the suite's most
        // frequent WebKit flake.
        await waitForCachedProjectName(page, projectId, cachedName);

        // Cut the cloud and reload: with the listeners unable to connect, the
        // project must come from the Dexie cache (read-while-offline). Allow for
        // slower re-hydration after reload (esp. Firefox).
        await cutFirestore(page);
        await page.reload();

        await expect(page.locator('#project-name')).toHaveValue(cachedName, {
            timeout: 20000,
        });

        await restoreFirestore(page);
    });
});

/** Cut the page off from the cloud for certain. Blocking new requests is not
 *  enough on its own: a write stream opened before the cut stays open, and an
 *  edit made straight afterwards can still reach the cloud through it. A
 *  reload closes it, and the project comes back from this device's copy. */
async function cutOffFromCloud(page: Page): Promise<void> {
    await cutFirestore(page);
    await page.reload();
    await page.locator('#project-name:not([disabled])').waitFor({
        timeout: 20000,
    });
}

/** The ids in one of the local database's project stores. */
async function storedProjectIDs(
    page: Page,
    store: 'projects' | 'setaside',
): Promise<string[]> {
    return page.evaluate(
        (name) =>
            new Promise<string[]>((resolve) => {
                const open = indexedDB.open('wordplay');
                open.onerror = () => resolve([]);
                open.onsuccess = () => {
                    const db = open.result;
                    if (!db.objectStoreNames.contains(name)) {
                        db.close();
                        resolve([]);
                        return;
                    }
                    const keys = db
                        .transaction(name, 'readonly')
                        .objectStore(name)
                        .getAllKeys();
                    keys.onerror = () => {
                        db.close();
                        resolve([]);
                    };
                    keys.onsuccess = () => {
                        db.close();
                        resolve(keys.result.map(String));
                    };
                };
            }),
        store,
    );
}
