import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { createTestCharacter } from '../helpers/createCharacter';
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
 * app shell (127.0.0.1:5002) from loading on reload — and the whole point here
 * is to reload mid-edit. Instead we abort only requests to the Firestore
 * emulator (localhost:8080), leaving the app origin and the auth emulator
 * reachable. The test-side admin SDK (waitForDocumentUpdate) is a separate Node
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
    test.describe.configure({ timeout: 90000 });

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
            30000,
        );
        expect(updated?.name).toBe(offlineName);
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

        const typed = 'Offline Hero';
        await page.locator('#character-name').fill(typed);
        const expectedName = `${loggedInUsername}/${typed}`;

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
            30000,
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

        // Start a chat and post a message — both writes abort against the cut
        // emulator but mirror locally + mark the chat dirty.
        await page.getByTestId('collaborate-toggle').click();
        await page
            .getByRole('button', {
                name: 'begin a discussion with yourself or others.',
            })
            .click();
        const messageEditor = page.locator('#new-message');
        await messageEditor.waitFor();
        await messageEditor.click();
        await page.keyboard.type('Offline hello');
        await page
            .locator(
                'button[aria-label^="send a message to your collaborators"]',
            )
            .click();

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
            30000,
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
        // Wait until it's mirrored to the cloud (and thus also the local cache).
        await waitForDocumentUpdate(
            page,
            'projects',
            projectId,
            (d) => d?.name === cachedName,
        );

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
