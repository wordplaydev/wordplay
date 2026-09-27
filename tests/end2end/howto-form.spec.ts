import { expect, test, type Page } from '../../playwright/fixtures';
import { enUS, text } from '../helpers/localize';
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

/** Open the how-to space's "+" form, type a title, and save it — as a draft by
 *  default, or posted to the canvas. A fresh gallery has no guiding questions,
 *  so a title alone is a valid how-to either way. */
/** The id of the one how-to a gallery document lists, which each of these
 *  tests has just waited for. */
function firstHowTo(gallery: { howTos?: unknown } | null | undefined): string {
    const howTos = gallery?.howTos;
    const id = Array.isArray(howTos) ? howTos[0] : undefined;
    if (typeof id !== 'string') throw new Error('Expected one how-to');
    return id;
}

async function createViaForm(
    page: Page,
    galleryId: string,
    title: string,
    post = false,
): Promise<void> {
    await page.goto(`/en-US/gallery/${galleryId}/howto`);
    await page
        .getByRole('button', {
            name: text(enUS.ui.howto.editor.newForm.header),
        })
        .click();
    const titleField = page.locator('#howto-title');
    await titleField.waitFor();
    await titleField.fill(title);
    await page
        .getByRole('button', {
            // From the locale rather than typed in English, so a reword moves
            // the test with the app instead of breaking it.
            name: text(
                post
                    ? enUS.ui.howto.editor.post.tip
                    : enUS.ui.howto.editor.save.tip,
            ),
        })
        .click();
}

test.describe('how-to editor form', () => {
    test.describe.configure({ timeout: 90000 });

    test('save-as-draft creates the how-to doc and links it to the gallery', async ({
        page,
    }) => {
        const galleryId = await createTestGallery(page, 'How-to CRUD Gallery');
        await waitForDocumentUpdate(page, 'galleries', galleryId, (d) => !!d);

        await createViaForm(page, galleryId, 'My First Draft');

        // addHowTo writes the how-to doc AND arrayUnions its id onto the
        // gallery in one batch — assert both landed.
        const gallery = await waitForDocumentUpdate(
            page,
            'galleries',
            galleryId,
            (d) => Array.isArray(d?.howTos) && d.howTos.length === 1,
        );
        const howToId = firstHowTo(gallery);
        const howTo = await getTestDocument('howtos', howToId);
        expect(howTo).not.toBeNull();
        expect(howTo?.galleryId).toBe(galleryId);
        expect(howTo?.published).toBe(false); // it's a draft
        expect(JSON.stringify(howTo?.title)).toContain('My First Draft');
    });

    test('a how-to tile is unselectable even though its title renders as markup', async ({
        page,
    }) => {
        // The tile disables selection so every mousedown goes to the drag path
        // (a mousedown skimming the title used to start a selection and leave a
        // stuck rectangle). Its title is block markup, which opts back into
        // selection everywhere else — and a descendant's own rule beats an
        // ancestor's, so the tile has to opt it out again explicitly.
        const galleryId = await createTestGallery(
            page,
            'How-to Selection Gallery',
        );
        await waitForDocumentUpdate(page, 'galleries', galleryId, (d) => !!d);
        // Post rather than save-as-draft: a draft renders in the drafts list,
        // and only a published how-to renders as a `.howto` tile on the canvas.
        await createViaForm(page, galleryId, 'A Draggable Draft', true);
        // Posting is a write, and the reload below reads it back. Without this
        // the navigation raced the batch that adds the how-to to the gallery, so
        // the canvas came up empty and the wait for a tile below burned the
        // whole test budget — the other standing flake in this suite.
        await waitForDocumentUpdate(
            page,
            'galleries',
            galleryId,
            (gallery) =>
                Array.isArray(gallery?.howTos) && gallery.howTos.length === 1,
        );

        await page.goto(`/en-US/gallery/${galleryId}/howto`);
        // Canvas tiles are virtualized to the camera's viewport, so a tile can
        // mount and unmount as the camera and the canvas size settle — and
        // getComputedStyle on a node that unmounted between resolving the
        // locator and reading it answers '' for every property. Poll rather
        // than read once, so the assertion is about the rendered tile.
        const title = page.locator('.howto .markup').first();
        // Bounded rather than left to inherit the 90s describe timeout. Most of
        // what made this spec flaky was three queries that Firestore rejected
        // outright for carrying two `array-contains` clauses (see
        // GalleryDatabase/ProjectsDatabase `startSync` and
        // CharacterDatabase.getByName) — with those listeners dead the client
        // only ever saw cached data, so a freshly posted how-to reached this page
        // when the cache happened to have it. Fixing them removed most of the
        // failures but not all, and the residue is worth a fresh look rather than
        // a longer wait; what this timeout decides is whether a bad run costs 20
        // seconds or 90.
        await title.waitFor({ state: 'attached', timeout: 20000 });
        await expect
            .poll(async () =>
                title
                    // WebKit exposes only the prefixed property.
                    .evaluate((e) => {
                        const style = getComputedStyle(e);
                        return (
                            style.userSelect ||
                            style.getPropertyValue('-webkit-user-select')
                        );
                    })
                    .catch(() => undefined),
            )
            .toBe('none');
    });

    test('reposting shows the same how-to in another gallery the author curates (#1065)', async ({
        page,
    }) => {
        // Through the real callable, which is the only writer of the fields the
        // read rule trusts — so this is also the check that the listener a
        // destination's members hold actually receives what it wrote.
        const home = await createTestGallery(page, 'Repost Home');
        const destination = await createTestGallery(page, 'Repost Destination');
        await createViaForm(page, home, 'A Shared How-To', true);
        const gallery = await waitForDocumentUpdate(
            page,
            'galleries',
            home,
            (g) => Array.isArray(g?.howTos) && g.howTos.length === 1,
        );
        const howTo = firstHowTo(gallery);

        await page.goto(`/en-US/gallery/${home}/howto?id=${howTo}`);
        await page
            .getByRole('button', { name: text(enUS.ui.howto.viewer.view.tip) })
            .first()
            .click();
        const selector = page.locator('#repostSelector');
        await expect
            .poll(
                () =>
                    selector.locator(`option[value="${destination}"]`).count(),
                {
                    timeout: 20000,
                },
            )
            .toBe(1);
        await selector.selectOption(destination);
        await page
            .getByRole('button', {
                name: text(enUS.ui.howto.viewer.repost.addButton),
            })
            .click();

        await waitForDocumentUpdate(
            page,
            'howtos',
            howTo,
            (h) =>
                Array.isArray(h?.reposts) &&
                h.reposts.includes(destination) &&
                Array.isArray(h?.repostReaders) &&
                h.repostReaders.length > 0,
            30000,
        );
        await page.goto(`/en-US/gallery/${destination}/howto`);
        await expect(page.locator(`#howto-${howTo}`)).toBeAttached({
            timeout: 20000,
        });
    });

    test('editing a draft autosaves the new title to the cloud', async ({
        page,
    }) => {
        const galleryId = await createTestGallery(page, 'How-to Edit Gallery');
        await waitForDocumentUpdate(page, 'galleries', galleryId, (d) => !!d);
        await createViaForm(page, galleryId, 'Before Edit');

        const gallery = await waitForDocumentUpdate(
            page,
            'galleries',
            galleryId,
            (d) => Array.isArray(d?.howTos) && d.howTos.length === 1,
        );
        const howToId = firstHowTo(gallery);
        await waitForDocumentUpdate(page, 'howtos', howToId, (d) =>
            JSON.stringify(d?.title).includes('Before Edit'),
        );

        // Reopen the draft, switch to edit mode, and change the title. Each
        // how-to form keeps its own #howto-title in the DOM (the closed "+"
        // form's too), so scope to the visible one — the open draft dialog.
        await page
            .getByRole('button', { name: text(enUS.ui.howto.drafts.tooltip) })
            .click();
        await page
            .getByRole('button', { name: text(enUS.ui.howto.viewer.edit.tip) })
            .click();
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

        await page
            .getByRole('button', {
                name: text(enUS.ui.howto.editor.newForm.header),
            })
            .click();
        const titleField = page.locator('#howto-title');
        await titleField.waitFor();
        await titleField.fill('Offline Draft');
        await page
            .getByRole('button', { name: text(enUS.ui.howto.editor.save.tip) })
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
        const howToId = firstHowTo(gallery);
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
