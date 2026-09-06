import { expect, test } from '../../playwright/fixtures';
import { createTestCharacter } from '../helpers/createCharacter';
import { createTestGallery } from '../helpers/createGallery';
import { drawTriangle } from '../helpers/drawCharacterPath';
import { uniqueCharacterName } from '../helpers/uniqueCharacterName';
import { waitForDocumentUpdate } from '../helpers/firestore';

/**
 * End-to-end coverage for sharing a character in a gallery (#822).
 *
 * The invariant is the one projects already have: membership lives on the
 * character document (`character.gallery`, the source of truth) AND in the
 * gallery document's `characters` array (the index the gallery page reads), and
 * one batch writes both. A test that checked only one side would pass while the
 * character was invisible in the gallery it claims to be in.
 */

/** Open the character's share dialog. A Dialog's `id` is the `?dialog=` URL
 *  parameter it persists itself with, not a DOM id, so the URL is both the
 *  simplest way in and the one that doesn't depend on where the toolbar
 *  happens to put the button at this viewport width. */
async function openShareDialog(
    page: import('@playwright/test').Page,
    characterId: string,
) {
    const picker = page.locator('#character-gallery-chooser');
    if (!(await picker.isVisible())) {
        await page.goto(
            `/en-US/character/${characterId}?dialog=character-share`,
        );
        // Sharing settings are grouped into tabs; the gallery chooser is on
        // its own, and Public is what opens first.
        await page.getByRole('tab', { name: 'Gallery' }).click();
        await picker.waitFor();
    }
}

async function shareCharacterToGallery(
    page: import('@playwright/test').Page,
    characterId: string,
    galleryId: string,
) {
    await openShareDialog(page, characterId);
    // Wait for the gallery to reach this page's dropdown before choosing it.
    // The galleries listener re-establishes on every full page load, and
    // selectOption's own retry reports only "did not find some options",
    // which says nothing about what it was actually waiting for.
    await page
        .locator(`#character-gallery-chooser option[value="${galleryId}"]`)
        .waitFor({ state: 'attached' });
    await page.locator('#character-gallery-chooser').selectOption(galleryId);
}

test('sharing a character to a gallery writes both character.gallery and gallery.characters', async ({
    page,
}) => {
    const galleryId = await createTestGallery(page, 'Character Gallery');
    const characterId = await createTestCharacter(page);

    await shareCharacterToGallery(page, characterId, galleryId);

    const character = await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.gallery === galleryId,
    );
    expect(character?.gallery).toBe(galleryId);

    // The half a single-document write would lose.
    const gallery = await waitForDocumentUpdate(
        page,
        'galleries',
        galleryId,
        (data) =>
            Array.isArray(data?.characters) &&
            data.characters.includes(characterId),
    );
    expect(gallery?.characters).toContain(characterId);
});

test('unsharing a character clears both sides', async ({ page }) => {
    const galleryId = await createTestGallery(page, 'Unshare Gallery');
    const characterId = await createTestCharacter(page);

    await shareCharacterToGallery(page, characterId, galleryId);
    await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.gallery === galleryId,
    );

    // The "—" entry is first and carries an undefined value.
    await openShareDialog(page, characterId);
    await page.locator('#character-gallery-chooser').selectOption({ index: 0 });

    const character = await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.gallery === null,
    );
    expect(character?.gallery).toBe(null);

    const gallery = await waitForDocumentUpdate(
        page,
        'galleries',
        galleryId,
        (data) =>
            Array.isArray(data?.characters) &&
            !data.characters.includes(characterId),
    );
    expect(gallery?.characters).not.toContain(characterId);
});

test('a shared character appears in the gallery page’s character list', async ({
    page,
}) => {
    const galleryId = await createTestGallery(page, 'Listing Gallery');
    const characterId = await createTestCharacter(page);

    // Give it a name, so the tile shows something identifiable. Distinct
    // from every other test's in this file: these run in parallel as one
    // creator, and a creator's character names must be unique — a colliding
    // one is deliberately not saved, so a shared name would leave this tile
    // blank and this assertion looking for a name never stored.
    const listed = uniqueCharacterName('Listed');
    const nameField = page.locator('#character-name');
    await nameField.waitFor();
    await nameField.fill(listed);
    await nameField.press('Tab');
    // The editor debounces its save; wait for the name before relying on it.
    await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) =>
            typeof data?.name === 'string' && data.name.endsWith(`/${listed}`),
    );

    await shareCharacterToGallery(page, characterId, galleryId);
    await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.gallery === galleryId,
    );

    await page.goto(`/en-US/gallery/${galleryId}`);
    // The section header, then the drawing itself — which is inert, so it's
    // found by its role rather than as a link.
    await expect(
        page.getByRole('heading', { name: 'Characters' }),
    ).toBeVisible();
    await expect(page.getByRole('img', { name: listed })).toBeVisible();
});

test('a colliding name is not saved, but the drawing still is', async ({
    page,
}) => {
    // The duplicate-name fix. Before it, the colliding name saved anyway
    // despite the notice, and `@username/Twin` then resolved to whichever of
    // the two documents the query happened to return last. The second half
    // matters just as much: holding back the whole save instead of just the
    // name would silently discard every stroke drawn afterwards.
    const twin = uniqueCharacterName('Twin');
    const firstId = await createTestCharacter(page);
    const firstName = page.locator('#character-name');
    await firstName.waitFor();
    await firstName.fill(twin);
    await firstName.press('Tab');
    // Wait for the first name to actually land: the editor debounces its save,
    // and without it there'd be no collision for the second one to hit, so the
    // test would pass while proving nothing.
    await waitForDocumentUpdate(
        page,
        'characters',
        firstId,
        (data) =>
            typeof data?.name === 'string' && data.name.endsWith(`/${twin}`),
    );

    const secondId = await createTestCharacter(page);
    const secondName = page.locator('#character-name');
    await secondName.waitFor();
    await secondName.fill(twin);
    await secondName.press('Tab');

    // Drawing is an edit to something other than the name.
    await drawTriangle(page);

    const character = await waitForDocumentUpdate(
        page,
        'characters',
        secondId,
        (data) => Array.isArray(data?.shapes) && data.shapes.length > 0,
    );
    expect(character?.shapes.length).toBeGreaterThan(0);
    // The colliding name never landed.
    expect(character?.name).not.toContain(twin);
});
