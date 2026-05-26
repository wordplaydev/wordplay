
import { expect, test } from '../../playwright/fixtures';
import { createTestCharacter } from '../helpers/createCharacter';
import { seedCollaborativeProject } from '../helpers/createCollaborativeProject';
import { createTestProject } from '../helpers/createProject';
import { uidForUsername } from '../helpers/loginNewContext';
import { waitForDocumentUpdate } from '../helpers/firestore';

test('editing a project saves it to the cloud', async ({ page }) => {
    // Create test project - the page will be redirected to the new project page 
    const projectId = await createTestProject(page);

    // Make an edit to the project
    const newProjectName = "What's in a name";
    const projectNameField = page.locator('#project-name');
    await projectNameField.fill(newProjectName);

    // Auto-retrying assertion: if a follow-up Firestore snapshot re-renders the
    // bound input and wipes the just-typed value, this fails fast with a clear
    // error instead of letting the test chase the downstream save symptom.
    await expect(projectNameField).toHaveValue(newProjectName);

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
    // The test under coverage is the Cloud Function that updates project
    // sources whenever a character is renamed. That function reads and
    // writes Firestore via the admin SDK; the editor UI is incidental.
    //
    // The page therefore stays on the character page for the whole test:
    // we never open the project in the browser, so there's no in-memory
    // Project view that could autosave (and clobber) the seeded source on
    // unmount, and no fragile "wait for the Firestore listener to deliver
    // the admin-SDK write to the DOM" step. Setup is admin-SDK only; the
    // assertion polls Firestore directly.

    // Create the character via the page (we still want to exercise the
    // real character-rename UI as the trigger for the Cloud Function).
    const characterId = await createTestCharacter(page);
    const characterNameInput = page.locator('#character-name');
    const initialCharacterName = 'Old';
    await characterNameInput.fill(initialCharacterName);

    const initialCharacterNameFull = `${loggedInUsername}/${initialCharacterName}`;
    await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.name === initialCharacterNameFull,
    );

    // Seed a project that already references the character, via admin SDK.
    // The page never visits /project/{id}, so there's no race between the
    // page's autosave and our admin write.
    const sourceCodeWithCharacterRef = `Phrase(\`@${initialCharacterNameFull}\`)`;
    const ownerUid = await uidForUsername(loggedInUsername);
    const projectId = await seedCollaborativeProject(
        ownerUid,
        undefined,
        sourceCodeWithCharacterRef,
    );

    // Trigger the Cloud Function by renaming the character. The page is
    // already on /character/{id} from createTestCharacter, so this is a
    // simple fill in place.
    const newCharacterName = 'New';
    await characterNameInput.fill(newCharacterName);

    const expectedFullName = `${loggedInUsername}/${newCharacterName}`;
    await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.name === expectedFullName,
    );

    // Poll Firestore for the Cloud Function's update — the actual subject
    // under test.
    const expectedSourceCode = `Phrase(\`@${expectedFullName}\`)`;
    const updatedProject = await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) => data?.sources?.[0]?.code === expectedSourceCode,
    );

    expect(updatedProject?.sources[0].code).toBe(expectedSourceCode);
});