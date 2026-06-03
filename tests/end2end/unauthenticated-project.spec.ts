import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { getTestDocument } from '../helpers/firestore';

/**
 * Local-first projects must work with no account at all: an anonymous creator
 * can make and edit a project that persists locally (Dexie) across reloads, and
 * is NOT written to the cloud (there's no owner to write it for). This uses a
 * fresh, unauthenticated browser context rather than the worker's signed-in
 * fixture page.
 */
test('an unauthenticated user creates and edits a local project that persists with no cloud doc', async ({
    browser,
}) => {
    test.setTimeout(60000);

    const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:5002',
        storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    try {
        // AddProject is rendered for everyone; logged out it creates a
        // null-owner local project.
        const projectId = await createTestProject(page);

        const localName = 'Local Anon Project';
        const nameField = page.locator('#project-name');
        await nameField.fill(localName);
        await expect(nameField).toHaveValue(localName);

        // Let the local Dexie write settle, then reload — the edit must survive
        // purely from the local cache (no cloud round-trip involved).
        await page.waitForTimeout(2000);
        await page.reload();
        await expect(page.locator('#project-name')).toHaveValue(localName);

        // And it must never have been written to the cloud: a local-only
        // project has no owner to persist it under.
        expect(await getTestDocument('projects', projectId)).toBeNull();
    } finally {
        await context.close();
    }
});
