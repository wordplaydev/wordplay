import { expect, test } from '../../playwright/fixtures';
import { grantClipboard } from '../helpers/clipboard';
import { createTestProject } from '../helpers/createProject';
import { enUS, localizeOff, localizeOn, text } from '../helpers/localize';

/**
 * A conflict's prose is composed — its name comes from one locale path, its explanation from
 * another, and the explanation is a template with the offending code substituted into it — so
 * none of it could be reached from localization mode (#1275). A concretized markup now reports
 * the template it came from, which is what lets the ordinary localization components edit it
 * in place.
 *
 * Expected strings are read from en-US rather than hard-coded, since the UI around them is
 * translated per locale.
 */

/** A program whose only problem is a name nothing declares, which is UnknownName. */
const UNKNOWN_NAME = `blah`;

const editTip = text(enUS.ui.localize.button.edit);
const conflictName = text(
    enUS.node.Reference.conflict.UnknownName.conflict.name,
);

async function projectWithConflict(
    page: Parameters<typeof createTestProject>[0],
) {
    await grantClipboard(page);
    await createTestProject(page);

    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate(
        (code) => navigator.clipboard.writeText(code),
        UNKNOWN_NAME,
    );
    await page.keyboard.press('ControlOrMeta+v');

    // The sidebar is what we're testing, so wait for the conflict to reach it.
    const row = page.locator('.annotation.conflict').first();
    await expect(row).toBeVisible({ timeout: 20000 });
    return row;
}

test('a conflict’s explanation and name are editable in localization mode', async ({
    page,
}) => {
    test.setTimeout(90000);

    const row = await projectWithConflict(page);
    await localizeOn(page);

    // Expand the row so the bubble — and its explanation — is showing.
    if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();
    await expect(row).toHaveAttribute('aria-expanded', 'true');

    // The name is a plain string at one locale path; the explanation is a template at
    // another. Both now offer an editor, where before the name's silently discarded every
    // edit and the explanation offered nothing at all.
    await expect(row.getByRole('button', { name: editTip })).not.toHaveCount(0);

    // Opening the explanation's editor seeds it with the *template*, not the rendered
    // sentence: `$name` is what a translator has to keep.
    const explanation = row.locator('aside').first();
    await explanation.getByRole('button', { name: editTip }).first().click();
    const field = row.getByRole('textbox').first();
    await expect(field).toHaveValue(/\$name/);

    // The row is a role="button" that toggles on Space and Enter. Typing into an editor
    // inside it must not collapse it, and the space must land in the field.
    const before = await field.inputValue();
    await field.press('End');
    await field.pressSequentially(' ok');
    await expect(row).toHaveAttribute('aria-expanded', 'true');
    await expect(field).toHaveValue(`${before} ok`);

    await localizeOff(page);
});

test('a saved override is re-concretized, so it still reads like the message', async ({
    page,
}) => {
    test.setTimeout(90000);

    const row = await projectWithConflict(page);
    await localizeOn(page);
    if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();

    const explanation = row.locator('aside').first();
    await explanation.getByRole('button', { name: editTip }).first().click();
    const field = row.getByRole('textbox').first();
    await field.fill('who is $name?');
    await row
        .getByRole('button', { name: text(enUS.ui.localize.button.submit) })
        .first()
        .click();

    // The point of the feature: what shows is the edited template with the offending code
    // substituted back in, not the raw `$name` the translator typed.
    await expect(explanation).toContainText('who is');
    await expect(explanation).not.toContainText('$name');
    await expect(explanation).toContainText('blah');

    await localizeOff(page);
});

test('the sidebar is unchanged when localization mode is off', async ({
    page,
}) => {
    test.setTimeout(90000);

    const row = await projectWithConflict(page);
    await localizeOff(page);
    if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();

    // The conflict still reads normally, and nothing offers an editor.
    await expect(row).toContainText(conflictName);
    await expect(row.getByRole('button', { name: editTip })).toHaveCount(0);
});
