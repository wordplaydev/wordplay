import { expect, test } from '@playwright/test';
import { createTestCharacter } from '../helpers/createCharacter';
import { joinViaUI } from '../helpers/joinViaUI';

/**
 * Choosing and changing the name other people see (#628 follow-up).
 *
 * A username used to be immutable because a character's name embeds it. It is
 * changeable now, and safe because the old name stays reserved to the same
 * creator and their characters carry it as an alias — so old references keep
 * resolving and their sign-in is untouched.
 */
test('a creator can change their username, and the old one still finds them', async ({
    page,
}) => {
    test.setTimeout(120000);
    const suffix = Date.now().toString().slice(-7);
    const before = `renamer${suffix}`;
    const after = `renamed${suffix}`;

    await joinViaUI(page, before, 'password');
    await expect(page.getByTestId('username')).toHaveText(before);

    // The explanation is Wordplay markup, where `@` starts a character
    // reference and `/` starts italics — so an innocent-looking `@you/Cat` in
    // the copy renders as a broken glyph and swallows the rest of the
    // paragraph. Both happened while writing this. Assert the sentence arrives
    // whole.
    await expect(
        page.getByText(/begins the name of every character you make/i),
    ).toBeVisible();

    // Rename.
    await page.locator('#username-choice-field').fill(after);
    await page
        .getByRole('button', { name: /use this username/i })
        .first()
        .click();

    // The name shown is the new one.
    await expect(page.getByTestId('username')).toHaveText(after, {
        timeout: 20000,
    });

    // And the old name is still theirs. Signing in with it must still work —
    // the rename deliberately leaves the auth address alone, which is exactly
    // what keeps a renamed creator able to get back in.
    await page.getByTestId('logout').click();
    await page.getByTestId('logout-confirm').click();
    await page.waitForURL(/\/login$/, { waitUntil: 'domcontentloaded' });

    await page.locator('#login-username-field').fill(before);
    await page.locator('#login-password-field').fill('password');
    await page.getByTestId('login-button').click();
    await page.waitForURL(/\/profile$/, { waitUntil: 'domcontentloaded' });

    // Signed in under the old name; shown under the new one.
    await expect(page.getByTestId('username')).toHaveText(after, {
        timeout: 20000,
    });
});

test('a name that cannot be claimed is offered a repair', async ({ page }) => {
    const suffix = Date.now().toString().slice(-7);
    await joinViaUI(page, `sugg${suffix}`, 'password');

    // `.` is the property symbol, so this name could never be half of a
    // `@username/Character` reference. Showing the nearest working name is
    // kinder than explaining which character is syntax.
    await page.locator('#username-choice-field').fill('nora.c.g');
    await expect(page.getByRole('button', { name: 'noracg' })).toBeVisible();

    await page.getByRole('button', { name: 'noracg' }).click();
    await expect(page.locator('#username-choice-field')).toHaveValue('noracg');
});

/** Read a character document straight from the emulator. The editor renders the
 *  reference as tokenized code, so asserting on its text is brittle; the stored
 *  name is the thing that actually has to move. */
async function characterDoc(id: string) {
    const response = await fetch(
        `http://127.0.0.1:8080/v1/projects/demo-wordplay/databases/(default)/documents/characters/${id}`,
    );
    const doc = await response.json();
    return {
        name: doc?.fields?.name?.stringValue as string | undefined,
        aliases: (
            (doc?.fields?.aliases?.arrayValue?.values ?? []) as {
                stringValue: string;
            }[]
        ).map((v) => v.stringValue),
    };
}

test("renaming moves a creator's characters and keeps the old name resolving", async ({
    page,
}) => {
    test.setTimeout(120000);
    const suffix = Date.now().toString().slice(-7);
    const before = `charown${suffix}`;
    const after = `charnew${suffix}`;

    await joinViaUI(page, before, 'password');

    // A character's name embeds its owner's username — which is exactly why a
    // username used to be immutable.
    const id = await createTestCharacter(page);
    await page.locator('#character-name').fill('Cat');
    await page.locator('#character-name').blur();
    await expect
        .poll(async () => (await characterDoc(id)).name, { timeout: 30000 })
        .toBe(`${before}/Cat`);

    // Rename the creator.
    await page.goto('/en-US/profile');
    await page.locator('#username-choice-field').fill(after);
    await page
        .getByRole('button', { name: /use this username/i })
        .first()
        .click();
    await expect(page.getByTestId('username')).toHaveText(after, {
        timeout: 20000,
    });

    // The character moved with them, and kept its old full name. That alias is
    // the whole point: `@charownNNN/Cat` is a language token that may sit in
    // anyone's project, and rewriting other people's source to chase a rename
    // would be far worse than a lookup that falls back to it.
    await expect
        .poll(async () => (await characterDoc(id)).name, { timeout: 30000 })
        .toBe(`${after}/Cat`);
    expect((await characterDoc(id)).aliases).toContain(`${before}/Cat`);
});
