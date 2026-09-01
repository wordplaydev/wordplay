import type { Page } from '@playwright/test';
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

/** The field for adding someone. Once the list has people in it the field
 *  waits behind a "+", so a test that adds a second person has to ask for it
 *  the way a person would. */
async function addField(page: Page) {
    const field = page.locator('#collaborator-to-add');
    if ((await field.count()) === 0)
        await page.getByRole('button', { name: 'add someone' }).click();
    return field;
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
    await (await addField(page)).fill(Collaborator);
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

    await (await addField(page)).fill(Collaborator);
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

    await (await addField(page)).fill(Collaborator);
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
        await (await addField(page)).fill(who);
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

    const field = await addField(page);
    await field.fill('ab');

    const message = page.locator('#collaborator-to-add-error');
    await expect(message).toBeVisible();
    // Visible to the eye and present in the accessibility tree — a floating
    // panel that ended up aria-hidden would look right and say nothing.
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(
        /at least 5 letters with no spaces/i,
    );

    // And it stays when focus goes. A message that leaves with the caret takes
    // the explanation with it, and what is left is a field with bad text in it
    // and an inactive submit button saying nothing.
    await page.locator('body').click();
    await expect(field).not.toBeFocused();
    await expect(message).toBeVisible();

    // And it goes when the reason goes, rather than lingering somewhere.
    await field.fill('student1');
    await expect(message).toHaveCount(0);
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');

    // Emptying the field is not a complaint worth leaving on screen, even
    // though an empty name is not a usable one.
    await field.fill('ab');
    await expect(message).toBeVisible();
    await field.fill('');
    await expect(message).toHaveCount(0);
});

test('a name nobody answers to is a validation error like any other', async ({
    page,
}) => {
    // "We don't know this creator" is a reason what you typed can't be used,
    // so it floats under the field with the format rules rather than sitting in
    // the row as a block that pushes the table down and can be clipped by the
    // tile.
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    const field = await addField(page);
    // Well-formed, so nothing is wrong with it until the lookup answers.
    await field.fill('nobodyhere');
    const message = page.locator('#collaborator-to-add-error');
    await expect(message).toHaveCount(0);

    await page
        .locator('button[aria-label^="Share the project with this email"]')
        .click();
    await expect(message).toBeVisible();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(/don't know a creator/i);

    // It survives the press that produced it taking focus away, which is the
    // case this whole rule exists for: the answer arrives from a lookup, and by
    // then the pointer has been somewhere else.
    await page.locator('body').click();
    await expect(field).not.toBeFocused();
    await expect(message).toBeVisible();

    // And typing again is a new attempt, so the last answer stops applying.
    await field.fill('nobodyhere2');
    await expect(message).toHaveCount(0);
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
});

test('the field for adding someone waits behind a plus', async ({ page }) => {
    // An empty field under every list is a lot of tile for something most
    // people use once, so once there is a list it is asked for.
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();

    // Nobody yet: the field is right there, since there is no list to add to.
    await expect(page.locator('#collaborator-to-add')).toBeVisible();
    await (await addField(page)).fill(Collaborator);
    await page
        .locator('button[aria-label^="Share the project with this email"]')
        .click();
    await expect(privilegeOf(page, Collaborator)).toBeVisible();

    // Now that there is a list, the field has stepped out of the way.
    await expect(page.locator('#collaborator-to-add')).toHaveCount(0);
    const plus = page.getByRole('button', { name: 'add someone' });
    await expect(plus).toBeVisible();

    // And the tour still has something to point at while it is closed.
    await expect(page.locator('[data-uiid="addCollaborator"]')).toBeVisible();

    await plus.click();
    await expect(page.locator('#collaborator-to-add')).toBeFocused();

    // And put away again by the same control, for someone who changed their
    // mind, with focus back where they left it.
    const cancel = page.getByRole('button', {
        name: 'never mind adding someone',
    });
    await cancel.click();
    await expect(page.locator('#collaborator-to-add')).toHaveCount(0);
    await expect(
        page.getByRole('button', { name: 'add someone' }),
    ).toBeFocused();
});

test('a row is a row before its creator loads, not an error', async ({
    page,
}) => {
    // Every list of people fills its creators from an async lookup, so on the
    // first paint each one is `null` — and CreatorView's `null` branch is an
    // orange Notice. Every row of the tile flashed one before the names
    // arrived, and the placeholder's different width resized the columns under
    // the reader as it went.
    await createTestProject(page);
    await page.getByTestId('collaborate-toggle').click();
    for (const who of [Collaborator, 'student1']) {
        if ((await page.locator('#collaborator-to-add').count()) === 0)
            await page.getByRole('button', { name: 'add someone' }).click();
        await page.locator('#collaborator-to-add').fill(who);
        await page
            .locator('button[aria-label^="Share the project with this email"]')
            .click();
        await expect(privilegeOf(page, who)).toBeVisible();
    }

    // Watch rather than sample: the creators resolve from cache in a
    // microtask, so anything read after the remount is already the settled
    // state and would pass against the bug.
    await page.evaluate(() => {
        const seen = { notice: 0, busy: 0 };
        (window as unknown as { seen: typeof seen }).seen = seen;
        new MutationObserver((records) => {
            for (const record of records)
                for (const node of record.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;
                    const rows = node.matches('.creator')
                        ? [node]
                        : [...node.querySelectorAll('.creator')];
                    for (const row of rows) {
                        if (row.querySelector('.feedback')) seen.notice++;
                        if (row.getAttribute('aria-busy') === 'true')
                            seen.busy++;
                    }
                }
        }).observe(document.body, { childList: true, subtree: true });
    });

    // Closing and reopening remounts the table with no creators yet, which is
    // the same first paint a page load gives.
    const tile = page.locator('[data-uiid="collaborate"]');
    await page.getByTestId('collaborate-toggle').click();
    await expect(tile).toHaveCount(0);
    await page.getByTestId('collaborate-toggle').click();
    await expect(page.locator('.creator[aria-busy="true"]')).toHaveCount(0, {
        timeout: 15000,
    });

    const seen = await page.evaluate(
        () =>
            (window as unknown as { seen: { notice: number; busy: number } })
                .seen,
    );
    // Rows that waited, and not one that claimed to be broken while it did.
    expect(seen.busy).toBeGreaterThan(0);
    expect(seen.notice).toBe(0);
});
