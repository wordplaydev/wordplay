import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { waitForDocumentUpdate } from '../helpers/firestore';
import { loginNewContext } from '../helpers/loginNewContext';

/**
 * The collaborate tile's table of people. A person has exactly one privilege
 * here, which is the thing the four separate lists it replaced could not say:
 * `withCollaborator` never removed anyone from `commenters`, so the same person
 * could appear three times in three sections.
 *
 * Uses a project this worker makes rather than the shared seed, since changing
 * a seeded collaborator's privilege would change what the other specs find.
 */

/** A seeded account, so the email lookup resolves to a real uid. */
const Collaborator = 'creator2';

/** The privilege cell for a person, by the picker's accessible name. */
function privilegeOf(page: import('@playwright/test').Page, name: string) {
    return page.getByLabel(`what ${name} can do`);
}

test('the table gives one person one privilege, and remembers it', async ({
    page,
}) => {
    const projectId = await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    // Only the owner is listed to begin with, so the picker for anyone else
    // does not exist yet.
    const picker = privilegeOf(page, Collaborator);
    await expect(picker).toHaveCount(0);

    // Add them. Collaborating is the default, which is what sharing a project
    // has always meant here.
    await page.locator('#collaborator-to-add').fill(Collaborator);
    await page
        .locator('button[aria-label^="Share the project with this email"]')
        .click();
    await expect(picker).toHaveValue('collaborate');

    // Change what they may do, and check the document rather than the screen:
    // the three lists are exclusive, so this has to be a move between them
    // rather than a second membership, and only the stored project says so.
    await picker.selectOption('comment');
    await expect(picker).toHaveValue('comment');

    const stored = await waitForDocumentUpdate(
        page,
        'projects',
        projectId,
        (data) =>
            Array.isArray(data?.commenters) && data.commenters.length === 1,
    );
    expect(stored?.commenters).toEqual([expect.any(String)]);
    expect(stored?.collaborators).toEqual([]);
    expect(stored?.viewers).toEqual([]);

    // Removing takes them off the project entirely, so the row goes.
    await page
        .getByRole('row')
        .filter({ hasText: Collaborator })
        .getByRole('button', { name: 'remove collaborator' })
        .click();
    await expect(privilegeOf(page, Collaborator)).toHaveCount(0);
});

test('choosing owner confirms before handing the project over', async ({
    page,
}) => {
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    await page.locator('#collaborator-to-add').fill(Collaborator);
    await page
        .locator('button[aria-label^="Share the project with this email"]')
        .click();
    const picker = privilegeOf(page, Collaborator);
    await expect(picker).toHaveValue('collaborate');

    // A transfer can't be undone by the person doing it, so the picker asks
    // rather than applying — and cancelling leaves the project alone.
    await picker.selectOption('owner');
    const confirm = page.getByRole('button', {
        name: 'make this person the owner of the project',
    });
    await expect(confirm).toBeVisible();
    await page.getByRole('button', { name: 'cancel' }).first().click();
    await expect(confirm).toHaveCount(0);
    await expect(picker).toHaveValue('collaborate');
});

test('the tour has something to point at', async ({ page }) => {
    // Nothing else covers this: a tour step whose `data-uiid` has gone just
    // renders "this part of the interface isn't currently visible", silently.
    // `restrictGallery` is left out, since it needs a gallery.
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();
    for (const uiid of ['collaborate', 'collaborators', 'addCollaborator'])
        await expect(page.locator(`[data-uiid="${uiid}"]`)).toBeVisible();
});

test('someone who is not the owner reads the table but cannot change it', async ({
    browser,
}) => {
    // creator2 is a collaborator on the seeded project, not its owner.
    const { context, page } = await loginNewContext(
        browser,
        'creator2',
        'password',
    );
    try {
        await page.goto('/en-US/project/seed-collab-project');
        await expect(page.locator('#project-name')).toHaveValue(
            'Shared Sketch',
            { timeout: 30_000 },
        );
        await page.getByTestId('collaborate-toggle').click();

        const table = page.locator('[data-uiid="collaborators"]');
        await expect(table.locator('table')).toBeVisible();
        // Their own privilege is readable as a word rather than a picker.
        await expect(table.getByText('collaborate')).toBeVisible();
        await expect(table.locator('select')).toHaveCount(0);
        await expect(page.locator('#collaborator-to-add')).toHaveCount(0);
        // With nothing focusable inside it, the scrolling region has to be
        // reachable by keyboard on its own.
        await expect(table).toHaveAttribute('tabindex', '0');
    } finally {
        await context.close();
    }
});

test('the tile says what it is for until it has been used', async ({
    page,
}) => {
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    // The owner's own row is left out — they brought that fact with them — so a
    // fresh project has no table at all, just the invitation to make one.
    const prompt = page.getByText('Add collaborators, commenters, and viewers');
    await expect(prompt).toBeVisible();
    await expect(page.locator('[data-uiid="collaborators"] table')).toHaveCount(
        0,
    );

    await page.locator('#collaborator-to-add').fill(Collaborator);
    await page
        .locator('button[aria-label^="Share the project with this email"]')
        .click();

    // Answered, so it stops being asked.
    await expect(privilegeOf(page, Collaborator)).toHaveValue('collaborate');
    await expect(prompt).toHaveCount(0);
    await expect(
        page.locator('[data-uiid="collaborators"] table'),
    ).toBeVisible();
});

test('writing a message hands the tile to the conversation', async ({
    page,
}) => {
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    // A commenter can see the chat; a viewer cannot, which is why the row is
    // not just the table's people over again.
    for (const [who, privilege] of [
        [Collaborator, 'comment'],
        ['student1', 'view'],
    ] as const) {
        await page.locator('#collaborator-to-add').fill(who);
        await page
            .locator('button[aria-label^="Share the project with this email"]')
            .click();
        await expect(privilegeOf(page, who)).toBeVisible();
        await privilegeOf(page, who).selectOption(privilege);
    }

    const table = page.locator('[data-uiid="collaborators"] table');
    const audience = page.locator('[data-uiid="collaborators"] .audience');
    await expect(table).toBeVisible();
    await expect(audience).toHaveCount(0);

    await page.locator('#new-message').click();
    await expect(audience).toBeVisible();
    await expect(table).toHaveCount(0);
    await expect(page.locator('#collaborator-to-add')).toHaveCount(0);
    await expect(audience).toContainText(Collaborator);
    await expect(audience).not.toContainText('student1');

    // Focus somewhere outside the composer and the permissions come back.
    await page.locator('#project-name').click();
    await expect(table).toBeVisible();
    await expect(audience).toHaveCount(0);
});

test('a rejected name is spoken, not just shown', async ({ page }) => {
    // The message floats free of the tile so nothing can clip it, which puts
    // it far from the field in the DOM's visual order. It still has to reach a
    // screen reader as that field's own description.
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    const field = page.locator('#collaborator-to-add');
    await field.fill('ab');

    const message = page.locator('#collaborator-to-add-error');
    await expect(message).toBeVisible();
    // Visible to the eye and present in the accessibility tree — a floating
    // panel that ended up aria-hidden would look right and say nothing.
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(
        /at least 5 letters with no spaces/i,
    );

    // And it goes when the reason goes, rather than lingering somewhere.
    await field.fill('student1');
    await expect(message).toHaveCount(0);
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
});
