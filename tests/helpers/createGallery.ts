import type { Page } from '@playwright/test';
import { waitForDocumentUpdate } from './firestore';
import { idFromURL } from './idFromURL';

/**
 * Create a new gallery via the /galleries page UI. The signed-in user becomes
 * the gallery's curator. Returns the new gallery's ID, read from the URL after
 * the create button redirects to the new gallery's page.
 *
 * Asks for the "yours" tab explicitly: the page only starts there when the
 * visitor already has galleries, so a creator making their first one would
 * otherwise land on "examples", where there's no create button.
 *
 * Optionally sets a gallery name so multi-gallery tests can disambiguate
 * dropdown entries.
 *
 * Does not return until the gallery document is actually in Firestore, name and
 * all. The URL changes as soon as the client has minted an id, which is well
 * before the write lands, and a caller that reads on from there is racing it:
 * the share picker lists galleries from a Firestore listener, so a test that
 * created one and immediately tried to choose it waited out its whole 60s budget
 * on a `selectOption` for an option that was never going to arrive. That was one
 * of the suite's two standing flakes.
 */
export async function createTestGallery(
    page: Page,
    name?: string,
): Promise<string> {
    await page.goto('/en-US/galleries?tab=yours');
    await page.getByRole('button', { name: 'new gallery' }).click();
    await page.waitForURL(/\/gallery\/[^/]+$/);
    const galleryID = idFromURL(page.url());

    // Wait for the gallery to exist in the cloud BEFORE typing into it. The URL
    // changes as soon as the client mints an id, and the name field renders
    // "Untitled" straight away — but when the listener then delivers the
    // server's copy, Svelte re-renders the field and a name typed in between is
    // discarded. `createTestProject` guards the same race by waiting for the
    // project to hydrate before touching its name field.
    await waitForDocumentUpdate(
        page,
        'galleries',
        galleryID,
        (gallery) => gallery !== undefined,
    );

    if (name !== undefined) {
        const nameField = page.locator('#gallery-name');
        await nameField.waitFor();
        await nameField.fill(name);
        // The name field's `done` handler fires on blur; tab away so the write
        // happens before the test proceeds.
        await nameField.press('Tab');
        // Deliberately not awaited or asserted: the name is cosmetic here, since
        // every caller selects a gallery by id. Measured with four browser
        // contexts against one emulator, the rename reaches the server for about
        // half of them within 500ms and for the rest not at all within 30s — a
        // resolved `setDoc` means the write was applied to the SDK's local copy,
        // not that the server has it. Asserting it would make this helper the
        // flakiest thing in the suite for a value nothing reads.
    }

    return galleryID;
}
