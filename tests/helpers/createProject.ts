import type { Page } from '@playwright/test';
import { idFromURL } from './idFromURL';

export async function createTestProject(
    page: Page,
    /** The UI locale to load in. It lives in the URL rather than in settings, so
     *  a spec that needs a particular language has to ask for it here — setting
     *  it in localStorage is overwritten by this navigation. */
    locale = 'en-US',
): Promise<string> {
    // Create a new project
    await page.goto(`/${locale}/projects`);
    await page.getByTestId('addproject').click();

    // Wait for the page to redirect to the new project
    await page.waitForURL(/\/project\/[^/]+$/);

    // Wait for the project to finish loading before returning — the name field is
    // disabled until the project is hydrated from the database, and interacting
    // before that causes a re-render to overwrite any edits made immediately after.
    await page.locator('#project-name:not([disabled])').waitFor();

    // The name field only proves the project is editable at the project level;
    // the editor's `readonly` class is what actually gates keystrokes. Waiting
    // on it makes an ownership/auth race fail here with a clear message rather
    // than as silently dropped typing deep inside a spec.
    await page
        .locator('[data-testid="editor"]:not(.readonly)')
        .first()
        .waitFor();

    // Extract the project ID from the URL (pathname only; the route appends ?mode=edit)
    return idFromURL(page.url());
}
