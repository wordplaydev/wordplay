import { expect, test } from '../../playwright/fixtures';
import { createTestGallery } from '../helpers/createGallery';
import { createTestProject } from '../helpers/createProject';
import { waitForDocumentUpdate } from '../helpers/firestore';

/**
 * End-to-end coverage for the gallery share/unshare path that was broken in
 * production (a student's project disappearing from a gallery's list). The
 * tests verify that the post-fix CRUD path keeps the project document and
 * gallery document in sync without lost updates from the read-modify-write
 * pattern the original code used.
 */

async function openShareDialog(
    page: import('@playwright/test').Page,
    projectId: string,
) {
    // Only navigate if we're not already on the project page. createTestProject
    // already lands us there, and a fresh navigation can race the persist of
    // the just-created project doc — a page reload would then 404.
    if (!page.url().includes(`/project/${projectId}`)) {
        await page.goto(`/en-US/project/${projectId}`);
    }
    // If the dialog is already open from a previous interaction, don't click
    // the open button again — just reuse the open dialog.
    const picker = page.locator('#gallerychooser');
    if (!(await picker.isVisible())) {
        await page
            .locator('[data-uiid="shareDialog"]')
            .getByRole('button', { name: 'show project sharing options' })
            .click();
        await picker.waitFor();
    }
}

async function shareProjectToGallery(
    page: import('@playwright/test').Page,
    projectId: string,
    galleryId: string,
) {
    await openShareDialog(page, projectId);
    // The Sharing component's gallery picker has id="gallerychooser".
    await page.locator('#gallerychooser').selectOption(galleryId);
}

async function unshareProject(
    page: import('@playwright/test').Page,
    projectId: string,
) {
    await openShareDialog(page, projectId);
    // The "—" entry has an empty/undefined value.
    await page.locator('#gallerychooser').selectOption({ index: 0 });
}

test('sharing a project to a gallery writes to both project.gallery and gallery.projects', async ({
    page,
}) => {
    const galleryId = await createTestGallery(page, 'Share Target Gallery');
    const projectId = await createTestProject(page);

    await shareProjectToGallery(page, projectId, galleryId);

    // Project doc should reference the gallery.
    const updatedProject = await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) => data?.gallery === galleryId,
    );
    expect(updatedProject?.gallery).toBe(galleryId);

    // Gallery doc's projects array should include the project ID. This is the
    // half of the write that the original setDoc-everything code could lose.
    const updatedGallery = await waitForDocumentUpdate(
        page,
        'galleries',
        galleryId,
        (data) =>
            Array.isArray(data?.projects) && data.projects.includes(projectId),
    );
    expect(updatedGallery?.projects).toContain(projectId);
});

test('unsharing a project clears both project.gallery and gallery.projects', async ({
    page,
}) => {
    const galleryId = await createTestGallery(page, 'Unshare Source Gallery');
    const projectId = await createTestProject(page);

    await shareProjectToGallery(page, projectId, galleryId);
    await waitForDocumentUpdate(
        page,
        'galleries',
        galleryId,
        (data) =>
            Array.isArray(data?.projects) && data.projects.includes(projectId),
    );

    await unshareProject(page, projectId);

    const clearedProject = await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) => data?.gallery === null,
    );
    expect(clearedProject?.gallery).toBeNull();

    const clearedGallery = await waitForDocumentUpdate(
        page,
        'galleries',
        galleryId,
        (data) =>
            Array.isArray(data?.projects) && !data.projects.includes(projectId),
    );
    expect(clearedGallery?.projects).not.toContain(projectId);
});

test('moving a project from one gallery to another cleans up the old gallery atomically', async ({
    page,
}) => {
    const sourceGalleryId = await createTestGallery(page, 'Move Source');
    const targetGalleryId = await createTestGallery(page, 'Move Target');
    const projectId = await createTestProject(page);

    // Initial share to the source gallery.
    await shareProjectToGallery(page, projectId, sourceGalleryId);
    await waitForDocumentUpdate(
        page,
        'galleries',
        sourceGalleryId,
        (data) =>
            Array.isArray(data?.projects) && data.projects.includes(projectId),
    );

    // Now re-share to a different gallery; the addProject batch should
    // arrayUnion on the new gallery and arrayRemove from the old in one step.
    await shareProjectToGallery(page, projectId, targetGalleryId);

    // Wait for the project to point at the new gallery.
    const movedProject = await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) => data?.gallery === targetGalleryId,
    );
    expect(movedProject?.gallery).toBe(targetGalleryId);

    // Target gallery should now contain the project.
    const targetGallery = await waitForDocumentUpdate(
        page,
        'galleries',
        targetGalleryId,
        (data) =>
            Array.isArray(data?.projects) && data.projects.includes(projectId),
    );
    expect(targetGallery?.projects).toContain(projectId);

    // Source gallery should no longer contain the project — this is the
    // critical assertion for the original production bug, where the old
    // gallery kept the dangling reference because the cleanup loop used a
    // stale snapshot.
    const sourceGallery = await waitForDocumentUpdate(
        page,
        'galleries',
        sourceGalleryId,
        (data) =>
            Array.isArray(data?.projects) && !data.projects.includes(projectId),
    );
    expect(sourceGallery?.projects).not.toContain(projectId);
});

// removeCreator / removeCurator are covered by unit tests
// (src/db/galleries/GalleryDatabase.test.ts) because the UI flow for triggering
// them requires a second user (a curator removes a creator from their gallery),
// which would require multi-user emulator scaffolding not yet built.
