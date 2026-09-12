import { expect, test } from '@playwright/test';
import { enUS, text } from '../helpers/localize';
import { cutFirestore, restoreFirestore } from '../helpers/firestoreOffline';
import { loginNewContext } from '../helpers/loginNewContext';

/**
 * Load-path safety net (Milestone 1). These exercise the seeded fixtures —
 * especially the deliberately HEAVY `creator` account (many projects + chats +
 * how-tos + characters) — and assert each domain loads cleanly. The connection
 * banner was removed in favor of the save-status button, which is pinned in the
 * footer toolbar that every page renders (Writing wraps Page too), so we assert
 * that button stays visible alongside the loaded content.
 *
 * The seed runs in tests/setup.ts (globalSetup); these log in as the seeded
 * `creator` / `teacher` (password "password").
 */

const NO_BANNER_TIMEOUT = 30_000;

test('heavy creator account loads /projects with previews', async ({
    browser,
}) => {
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await page.goto('/en-US/projects');
        // The heavy account's projects render…
        await expect(page.getByTestId('preview').first()).toBeVisible({
            timeout: NO_BANNER_TIMEOUT,
        });
        // …and the pinned save-status button is visible (it must never hide).
        await expect(page.getByTestId('save-status')).toBeVisible();
    } finally {
        await context.close();
    }
});

test('creator can open a seeded project (galleries/projects sync resolves)', async ({
    browser,
}) => {
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        // For a fresh login (empty local cache) the project name can only
        // appear if the cloud sync resolved — so loading "Shared Sketch" IS the
        // connection-healthy signal (the old banner check is gone).
        await page.goto('/en-US/project/seed-collab-project');
        await expect(page.locator('#project-name')).toHaveValue(
            'Shared Sketch',
            {
                timeout: NO_BANNER_TIMEOUT,
            },
        );
        // Connection/save feedback now lives on the save-status button, which is
        // pinned in the footer toolbar and must always be visible (never hidden
        // in the overflow menu).
        await expect(page.getByTestId('save-status')).toBeVisible();
    } finally {
        await context.close();
    }
});

test('creator how-to space loads seeded how-tos', async ({ browser }) => {
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await page.goto('/en-US/gallery/seeded-howto-gallery-id/howto');
        // Assert the loaded how-to is present in the DOM, not visible: canvas
        // tiles are virtualized to the viewport, and the title also renders in
        // the (collapsed, hidden) navigation list — so presence is the reliable
        // "the how-to synced" signal, independent of camera position.
        await expect(
            page.getByText('Use color to set mood').first(),
        ).toBeAttached({ timeout: NO_BANNER_TIMEOUT });
        // The save-status button (which replaced the connection banner) is
        // pinned in the footer toolbar and must always be visible.
        await expect(page.getByTestId('save-status')).toBeVisible();
    } finally {
        await context.close();
    }
});

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
    await page.goto('/en-US/gallery/seed-public-gallery-00/howto');
    await expect(
        page.getByText('A how-to anyone can read').first(),
    ).toBeAttached({ timeout: NO_BANNER_TIMEOUT });
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
    // The regression this exists for: a signed-out visitor has no realtime
    // listeners at all, so nothing ever re-ran the page's lookups. One read that
    // overran `Database.READ_TIMEOUT_MS` therefore left a public space blank for
    // the life of the page — no error, no spinner that ever resolved, and no way
    // back but a reload. It was also the WebKit nightly's most frequent failure,
    // because a cold WebChannel connection on a loaded macOS runner is exactly
    // how a read overruns.
    //
    // Cut before navigating, so the very first lookup is the one that fails.
    await cutFirestore(page);
    await page.goto('/en-US/gallery/seed-public-gallery-00/howto');

    // It cannot be there yet — this is the state that used to be permanent.
    await expect(page.getByText('A how-to anyone can read')).toHaveCount(0);

    // Hand the cloud back and touch nothing else: the page has to notice on its
    // own. No reload here is the whole assertion.
    await restoreFirestore(page);
    await expect(
        page.getByText('A how-to anyone can read').first(),
    ).toBeAttached({ timeout: NO_BANNER_TIMEOUT });
});
