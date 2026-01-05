
import { expect, test } from '../../playwright/fixtures';
import { createTestCharacter } from '../helpers/createCharacter';
import { createTestProject } from '../helpers/createProject';
import { updateProjectSource, waitForDocumentUpdate } from '../helpers/firestore';

test('editing a project saves it to the cloud', async ({ page }) => {
    // Create test project - the page will be redirected to the new project page 
    const projectId = await createTestProject(page);

    // Make an edit to the project
    const newProjectName = "What's in a name";
    const projectNameField = page.locator('#project-name');
    await projectNameField.fill(newProjectName);
    expect(await projectNameField.inputValue()).toBe(newProjectName);

    // Wait for the project to be updated in Firestore
    const updatedProjectData = await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) => data?.name === newProjectName,
    );

    // Verify the edit was saved to the cloud
    expect(updatedProjectData?.name).toBe(newProjectName);
});


test('editing a custom character saves it to the cloud', async ({
    page,
    loggedInUsername,
}) => {
    // Create test character - the page will be redirected to the new character page
    const characterId = await createTestCharacter(page);

    // Make an edit to the character
    const characterNameInput = 'My Cool Character';
    await page.locator('#character-name').fill(characterNameInput);

    // Wait for the character to be updated in Firestore
    const expectedFullName = `${loggedInUsername}/${characterNameInput}`;
    const updatedCharacterData = await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.name === expectedFullName,
    );

    // Verify the edit was saved to the cloud
    expect(updatedCharacterData?.name).toBe(expectedFullName);
});

test('changing a character name updates its project references', async ({
    page,
    loggedInUsername,
}) => {
    // Create test character - the page will be redirected to the new character page
    const characterId = await createTestCharacter(page);

    // Set a name for the character since the default is empty
    const characterNameInput = page.locator('#character-name');
    const initialCharacterName = 'Old';
    await characterNameInput.fill(initialCharacterName);

    // Wait for it to save
    const initialCharacterNameFull = `${loggedInUsername}/${initialCharacterName}`;
    await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.name === initialCharacterNameFull,
    );

    // Create a test project - this will redirect to the project page
    const projectId = await createTestProject(page);

    // Wait for the project to be saved to Firestore
    await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) => data?.id === projectId,
    );

    // Update the project source to include a reference to the character
    const sourceCodeWithCharacterRef = `Phrase(\`@${initialCharacterNameFull}\`)`;
    await updateProjectSource(projectId, sourceCodeWithCharacterRef);

    // Now, rename the character
    await page.goto(`/character/${characterId}`);
    const newCharacterName = 'New';
    await page.locator('#character-name').fill(newCharacterName);

    // Wait for the character to be updated in Firestore
    const expectedFullName = `${loggedInUsername}/${newCharacterName}`;
    await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.name === expectedFullName,
    );

    // Wait for the project to be updated with the new character reference
    const expectedSourceCode = `Phrase(\`@${expectedFullName}\`)`;
    const updatedProject = await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) => data?.sources?.[0]?.code === expectedSourceCode,
    );

    // Verify the character reference was updated in the project
    expect(updatedProject?.sources[0].code).toBe(expectedSourceCode);
});