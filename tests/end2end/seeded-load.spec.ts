import { expect, test } from '@playwright/test';
import { enUS, text } from '../helpers/localize';
import { cutFirestore, restoreFirestore } from '../helpers/firestoreOffline';
import { loginNewContext } from '../helpers/loginNewContext';
import { recordPage } from '../helpers/pageDiagnostics';

/**
 * Load-path safety net (Milestone 1). These exercise the seeded fixtures and
 * assert each domain loads cleanly for whoever is reading it. The heavy
 * `creator` account's projects list, project, and how-to space — and the
 * save-status button pinned beside each — are asserted by the axe scans of the
 * same pages in accessibility-authed.spec.ts, which already sign in and load them.
 *
 * The seed runs in tests/setup.ts (globalSetup); these log in as the seeded
 * `creator` / `teacher` (password "password").
 */

const NO_BANNER_TIMEOUT = 30_000;

test('teacher sees how-tos authored by other users in the class gallery', async ({
    browser,
}) => {
    const { context, page } = await loginNewContext(
        browser,
        'teacher',
        'password',
    );
    try {
        await page.goto('/en-US/gallery/seeded-class-gallery-id/howto');
        // A how-to authored by creator2 (not the teacher) loads for the gallery
        // curator — exercises the gallery how-to listener delivering content the
        // viewer didn't author. Assert presence (DOM), not viewport visibility.
        await expect(
            page.getByText('How-to by creator2 #1').first(),
        ).toBeAttached({ timeout: NO_BANNER_TIMEOUT });
    } finally {
        await context.close();
    }
});

test('an expanded-scope viewer reads the space but cannot add to it', async ({
    browser,
}) => {
    // `creator` curates nothing in this gallery — `teacher` does — and reaches it
    // only through `howToViewersFlat`. That grant is a field on the *gallery*, and
    // the rules used to look for it on the how-to, where nothing ever wrote it, so
    // this whole path was dead and the fixture it needs had sat unread since #882
    // (#907). Read-only is the other half of the claim: a guest takes part in a
    // how-to but does not post to someone else's space.
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await page.goto(
            '/en-US/gallery/seeded-expanded-scope-gallery-id/howto',
        );
        // Attached rather than visible: canvas tiles are virtualized to the
        // camera's viewport, so presence is the "it synced" signal.
        await expect(
            page.getByText('Expanded-scope how-to').first(),
        ).toBeAttached({ timeout: NO_BANNER_TIMEOUT });
        // Names read from the locale rather than typed in English, so a reword
        // moves the test with the app.
        await expect(
            page.getByRole('button', {
                name: text(enUS.ui.howto.editor.newForm.header),
            }),
        ).toHaveCount(0);
        await expect(
            page.getByText(text(enUS.ui.howto.drafts.header)),
        ).toHaveCount(0);
    } finally {
        await context.close();
    }
});

test('a signed-out visitor reads a public space and cannot take part', async ({
    page,
}) => {
    // No fixture login at all: the public branch of the read rule is the one path
    // that must work with no account. The social pane is the other half — #907's
    // "the entire social pane should be removed" for a passer-by.
    //
    // Recorded because this is the nightly's most persistent WebKit failure and
    // its artifacts are not reachable from every environment; the job log is.
    const dump = recordPage(page);
    // Riding this navigation rather than adding tests of their own: every
    // Playwright test costs seconds forever, and both claims below are about
    // the same page in the same state.
    const refusals: string[] = [];
    page.on('console', (message) => {
        if (message.text().includes('permission-denied'))
            refusals.push(message.text());
    });
    await page.goto('/en-US/gallery/seed-public-gallery-00/howto');
    try {
        await expect(
            page.getByText('A how-to anyone can read').first(),
        ).toBeAttached({ timeout: NO_BANNER_TIMEOUT });
    } catch (problem) {
        await dump('signed-out public space never loaded');
        throw problem;
    }
    // A how-to's markup is rendered, not just its title: `@Phrase` becomes a
    // link only if this page built a concept index a visitor can resolve
    // against. (The narrower gate #1375 also fixed — gallery how-tos being left
    // out of that index for a signed-out reader — would need a how-to linking to
    // another how-to by title, which no fixture has.)
    await expect(page.locator('.conceptlink').first()).toBeAttached({
        timeout: NO_BANNER_TIMEOUT,
    });
    // Nothing a visitor does here may attempt a write. Not specific to one bug;
    // it is the shape of the whole class, since a refused write is silent apart
    // from the console.
    expect(refusals).toEqual([]);
    await expect(
        page.getByRole('button', {
            name: text(enUS.ui.howto.bookmarks.canBookmark.label),
        }),
    ).toHaveCount(0);
    await expect(
        page.getByRole('button', {
            name: text(enUS.ui.howto.editor.newForm.header),
        }),
    ).toHaveCount(0);
});

test('a public space that could not be read at first fills in when the cloud comes back', async ({
    page,
}) => {
    // The regression this exists for: a signed-out visitor had no realtime
    // listeners at all, so nothing ever re-ran the page's lookups. One read that
    // overran `Database.READ_TIMEOUT_MS` therefore left a public space blank for
    // the life of the page — no error, no spinner that ever resolved, and no way
    // back but a reload. It was also the WebKit nightly's most frequent failure,
    // because a cold WebChannel connection on a loaded macOS runner is exactly
    // how a read overruns.
    //
    // The claim is unchanged but what answers it is not: a visitor now holds a
    // real subscription (`Galleries.watchPublic`, #1375), so recovery is
    // Firestore's own stream retry rather than the page's backoff. This is
    // therefore also the test that says whether the how-tos still arrive without
    // the re-ask that used to fetch them.
    //
    const dump = recordPage(page);

    // Cut before navigating, so the very first lookup is the one that fails.
    await cutFirestore(page);
    await page.goto('/en-US/gallery/seed-public-gallery-00/howto');

    // It cannot be there yet — this is the state that used to be permanent.
    await expect(page.getByText('A how-to anyone can read')).toHaveCount(0);

    // Hand the cloud back and touch nothing else: the page has to notice on its
    // own. No reload here is the whole assertion.
    await restoreFirestore(page);
    try {
        await expect(
            page.getByText('A how-to anyone can read').first(),
        ).toBeAttached({ timeout: NO_BANNER_TIMEOUT });
    } catch (problem) {
        await dump('public space never recovered after the cloud came back');
        throw problem;
    }
});
