import type { Page } from '@playwright/test';

/**
 * Grant clipboard access, where the browser has a permission to grant.
 *
 * Only Chromium gates scripted clipboard access behind a permission. WebKit
 * has no such permission name, and `grantPermissions` throws `Unknown
 * permission: clipboard-write` rather than ignoring it — which failed every
 * clipboard-using spec on the WebKit nightly, before any of them reached an
 * assertion.
 */
export async function grantClipboard(page: Page): Promise<void> {
    if (page.context().browser()?.browserType().name() !== 'chromium') return;
    await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
}
