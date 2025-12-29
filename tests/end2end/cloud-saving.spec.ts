
import { expect, test } from '../../playwright/fixtures';
import { getTestDocument, listTestDocuments } from '../helpers/firestore';

test('editing a project saves it to the cloud', async ({ page }) => {
    // The user is already logged in via the fixture.
    await page.goto('/projects');

    // Create a blank project
    await page.getByTestId('addproject').click();

    // Wait for project to be saved to the cloud
    // Saves are debounced by 1 second, so wait at least that long
    await page.waitForTimeout(2000);

    // Verify the project was saved to the cloud
    const documents = await listTestDocuments('projects');
    expect(documents.length).toBeGreaterThan(0);

    const projectDoc = documents[documents.length - 1];
    const projectData = await getTestDocument('projects', projectDoc.id);
    expect(projectData).toBeDefined();

    // Make an edit to the project
    const newProjectName = "What's in a name";
    await page.locator('#project-name').fill(newProjectName);

    // Wait for project to be saved to the cloud
    await page.waitForTimeout(2000);

    // Verify the edit was saved to the cloud
    const updatedProjectData = await getTestDocument('projects', projectDoc.id);
    expect(updatedProjectData?.name).toBe(newProjectName);
});