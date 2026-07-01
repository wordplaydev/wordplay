
import { expect, test } from '../../playwright/fixtures';
import { createTestCharacter } from '../helpers/createCharacter';
import { seedCollaborativeProject } from '../helpers/createCollaborativeProject';
import { createTestProject } from '../helpers/createProject';
import { uidForUsername } from '../helpers/loginNewContext';
import {
    waitForClientCachedProject,
    waitForDocumentUpdate,
} from '../helpers/firestore';

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
    // The character-rename rewrite is CLIENT-SIDE: CharacterDatabase.updateCharacter
    // iterates the in-memory db.Projects.allEditableProjects and revises any
    // ConceptLink references (there is no Cloud Function). So the referencing
    // project MUST be loaded in this page's client before we rename — otherwise
    // the rewrite iterates a set that lacks it and silently does nothing.
    //
    // We make that deterministic by getting the project into the client's local
    // (Dexie) cache first: on the character page, ProjectsDatabase.trackLocal
    // rehydrates cached projects into allEditableProjects at load, independent of
    // realtime-listener timing (historically the flake source on slower browsers).

    // Create the character via the page (we exercise the real rename UI as the
    // trigger for the rewrite).
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

    // Seed a project that references the character (deterministic source via the
    // admin SDK).
    const sourceCodeWithCharacterRef = `Phrase(\`@${initialCharacterNameFull}\`)`;
    const ownerUid = await uidForUsername(loggedInUsername);
    const projectId = await seedCollaborativeProject(
        ownerUid,
        undefined,
        sourceCodeWithCharacterRef,
    );

    // Open the project so the client loads the referenced source into memory,
    // then make a trivial (name-only) client edit. That marks the project
    // unsaved, so persist() writes it — reference source included — into the
    // local Dexie cache. The source is untouched, so there's no clobber.
    await page.goto(`/en-US/project/${projectId}`);
    const projectNameField = page.locator('#project-name:not([disabled])');
    await projectNameField.waitFor();
    const seededProjectName = 'Referencing project';
    await projectNameField.fill(seededProjectName);
    await expect(projectNameField).toHaveValue(seededProjectName);
    await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) => data?.name === seededProjectName,
    );

    // Return to the character page. On load, trackLocal rehydrates the cached
    // referencing project into allEditableProjects.
    await page.goto(`/en-US/character/${characterId}`);

    // Confirm the client's local cache holds the project with its reference
    // before we rename — the precondition for the rewrite to have anything to do.
    await waitForClientCachedProject(
        page,
        projectId,
        `@${initialCharacterNameFull}`,
    );

    // Trigger the client-side rewrite by renaming the character.
    const newCharacterName = 'New';
    await page.locator('#character-name').fill(newCharacterName);

    const expectedFullName = `${loggedInUsername}/${newCharacterName}`;
    await waitForDocumentUpdate(
        page,
        'characters',
        characterId,
        (data) => data?.name === expectedFullName,
    );

    // The client rewrite should update the referencing project's source, which
    // then saves to the cloud — the actual subject under test.
    const expectedSourceCode = `Phrase(\`@${expectedFullName}\`)`;
    const updatedProject = await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) => data?.sources?.[0]?.code === expectedSourceCode,
    );

    expect(updatedProject?.sources[0].code).toBe(expectedSourceCode);
});