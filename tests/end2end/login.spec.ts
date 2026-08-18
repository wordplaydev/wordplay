import { expect, test } from '../../playwright/fixtures';

test('verify default login, logout, and login form', async ({ page }) => {
    // fixtures.ts logins in the user prior to this.

    await page.goto('/en-US/');

    // Go to the profile page and wait for the auth to load.
    await page.goto('/en-US/profile');

    // Verify that the profile username page is visible. Give it headroom: on a
    // fresh load (especially WebKit) Firebase Auth restores the session from
    // IndexedDB asynchronously, so the profile can briefly show its loading
    // state before the username renders — longer than the 5s expect default.
    await expect(page.getByTestId('username')).toBeVisible({ timeout: 20000 });
});

/**
 * Finishing a sign-in by pasting the emailed link, for when the link opens
 * somewhere this page can't see (#564). An installed app hands email links to a
 * browser, and on iOS that browser is a separate storage container, so the
 * sign-in would otherwise complete there and leave the installed app signed
 * out. Reading the email on another device has always had the same problem.
 *
 * The link here is never visited: it goes straight from the auth emulator into
 * the field, which is exactly the crossing the feature exists to make possible.
 */
test('a login link pasted in by hand signs in, without ever being visited', async ({
    browser,
}) => {
    test.setTimeout(90000);

    const project = 'demo-wordplay';
    const auth = 'http://127.0.0.1:9099';
    const email = `paste-${Date.now()}@wordplay.dev`;

    // Give the page an account to find; it declines to send a link otherwise.
    await fetch(
        `${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password',
                returnSecureToken: true,
            }),
        },
    );

    // Signed out, like anyone reaching the login page.
    const context = await browser.newContext({
        baseURL: 'http://127.0.0.1:5002',
        storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();
    await page.goto('/en-US/login');

    const pasteForm = page.getByTestId('paste-link-form');
    await expect(pasteForm).toBeHidden();

    await page.locator('#login-email-field').fill(email);
    await page.getByTestId('email-login-form').locator('button').last().click();

    // The field only appears once a link has been sent, so it can't invite a
    // paste before there is anything to paste.
    await expect(pasteForm).toBeVisible({ timeout: 20000 });

    const codes: { oobCodes?: { email: string; oobLink: string }[] } = await (
        await fetch(`${auth}/emulator/v1/projects/${project}/oobCodes`)
    ).json();
    const link = (codes.oobCodes ?? [])
        .filter((code) => code.email === email)
        .pop()?.oobLink;
    expect(link, 'the auth emulator sent a sign-in link').toBeTruthy();

    await page.locator('#login-link-field').fill(link ?? '');
    await pasteForm.locator('button').last().click();

    await page.waitForURL(/\/profile$/, { timeout: 30000 });
    await expect(page.getByTestId('username')).toBeVisible({ timeout: 20000 });

    await context.close();
});
