import { expect, test, type Page } from '../../playwright/fixtures';
import { createTestGallery } from '../helpers/createGallery';
import { waitForDocumentUpdate, getTestDocument } from '../helpers/firestore';
import {
    cutFirestore,
    restoreFirestore,
    waitForDirty,
} from '../helpers/firestoreOffline';

/**
 * End-to-end coverage for the how-to editor form — create, save-as-draft, edit,
 * and offline-create. This UI had no e2e coverage despite being where the recent
 * how-to bugs lived: the Dexie DataCloneError on save, the autosave infinite
 * loop, and the `not-found` replay on a how-to created offline.
 *
 * A how-to lives under a gallery, so each test makes a fresh gallery (empty
 * `howTos`) online first, then drives the form in /gallery/<id>/howto.
 */

/** Open the how-to space's "+" form, type a title, and save it as a draft.
 *  A fresh gallery has no guiding questions, so a title alone is a valid draft. */
async function createDraftViaForm(
    page: Page,
    galleryId: string,
    title: string,
): Promise<void> {
    await page.goto(`/en-US/gallery/${galleryId}/howto`);
    await page.getByRole('button', { name: 'Create a new how-to' }).click();
    const titleField = page.locator('#howto-title');
    await titleField.waitFor();
    await titleField.fill(title);
    await page
        .getByRole('button', { name: 'save your how-to as a draft' })
        .click();
}

test.describe('how-to editor form', () => {
    test.describe.configure({ timeout: 90000 });

    test('save-as-draft creates the how-to doc and links it to the gallery', async ({
        page,
    }) => {
        const galleryId = await createTestGallery(page, 'How-to CRUD Gallery');
        await waitForDocumentUpdate(page, 'galleries', galleryId, (d) => !!d);

        await createDraftViaForm(page, galleryId, 'My First Draft');

        // addHowTo writes the how-to doc AND arrayUnions its id onto the
        // gallery in one batch — assert both landed.
        const gallery = await waitForDocumentUpdate(
            page,
            'galleries',
            galleryId,
            (d) => Array.isArray(d?.howTos) && d.howTos.length === 1,
        );
        const howToId = (gallery?.howTos as string[])[0];
        const howTo = await getTestDocument('howtos', howToId);
        expect(howTo).not.toBeNull();
        expect(howTo?.galleryId).toBe(galleryId);
        expect(howTo?.published).toBe(false); // it's a draft
        expect(JSON.stringify(howTo?.title)).toContain('My First Draft');
    });

    test('editing a draft autosaves the new title to the cloud', async ({
        page,
    }) => {
        const galleryId = await createTestGallery(page, 'How-to Edit Gallery');
        await waitForDocumentUpdate(page, 'galleries', galleryId, (d) => !!d);
        await createDraftViaForm(page, galleryId, 'Before Edit');

        const gallery = await waitForDocumentUpdate(
            page,
            'galleries',
            galleryId,
            (d) => Array.isArray(d?.howTos) && d.howTos.length === 1,
        );
        const howToId = (gallery?.howTos as string[])[0];
        await waitForDocumentUpdate(page, 'howtos', howToId, (d) =>
            JSON.stringify(d?.title).includes('Before Edit'),
        );

        // Reopen the draft, switch to edit mode, and change the title. Each
        // how-to form keeps its own #howto-title in the DOM (the closed "+"
        // form's too), so scope to the visible one — the open draft dialog.
        await page.getByRole('button', { name: 'view your draft' }).click();
        await page.getByRole('button', { name: 'edit this how-to' }).click();
        const titleField = page.locator('#howto-title:visible');
        await titleField.waitFor();
        await titleField.fill('After Edit');
        // Autosave is debounced; blur to help it fire, then poll the cloud.
        await titleField.press('Tab');

        const updated = await waitForDocumentUpdate(
            page,
            'howtos',
            howToId,
            (d) => JSON.stringify(d?.title).includes('After Edit'),
            30000,
        );
        expect(JSON.stringify(updated?.title)).toContain('After Edit');
    });

    test('a how-to CREATED offline is replayed as a create (not-found regression)', async ({
        page,
    }) => {
        const galleryId = await createTestGallery(
            page,
            'How-to Offline Gallery',
        );
        await waitForDocumentUpdate(page, 'galleries', galleryId, (d) => !!d);

        // Navigate to the space online, THEN cut the cloud, so only the create
        // write is offline.
        await page.goto(`/en-US/gallery/${galleryId}/howto`);
        await cutFirestore(page);

        await page.getByRole('button', { name: 'Create a new how-to' }).click();
        const titleField = page.locator('#howto-title');
        await titleField.waitFor();
        await titleField.fill('Offline Draft');
        await page
            .getByRole('button', { name: 'save your how-to as a draft' })
            .click();

        // Wait until the new how-to's dirty row is durable (its id is generated
        // client-side, so match the howtos: prefix) before reloading.
        await waitForDirty(page, 'howtos:');

        // Reload while cut (destroys the in-memory create), then reconnect and
        // reload so flushUnsaved replays via batch.set + arrayUnion.
        await page.reload();
        await restoreFirestore(page);
        await page.reload();

        const gallery = await waitForDocumentUpdate(
            page,
            'galleries',
            galleryId,
            (d) => Array.isArray(d?.howTos) && d.howTos.length === 1,
            30000,
        );
        const howToId = (gallery?.howTos as string[])[0];
        const howTo = await getTestDocument('howtos', howToId);
        expect(howTo).not.toBeNull();
        expect(JSON.stringify(howTo?.title)).toContain('Offline Draft');
    });

    // NOTE: the delete-while-dirty / phantom-unsaved fix (delete clears the
    // durable dirty row) is covered deterministically in
    // CharacterDatabase.test.ts. It can't be isolated end-to-end: to prove the
    // *delete* clears the row, the item must be dirty at delete time, which
    // requires deleting while offline — but the offline how-to form hangs on its
    // unresolved create and the offline draft list doesn't populate, and online
    // deletes race Firestore's own reconnect queue clearing the row first.
});
