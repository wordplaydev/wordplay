import { expect, test } from '@playwright/test';
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
