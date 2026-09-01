import { expect, test } from '@playwright/test';

/**
 * When a field's validation message is on screen, and how many can be.
 *
 * A message outlives the focus that raised it: clicking away from a rejected
 * value used to take the explanation with it, leaving bad text and an inactive
 * submit button saying nothing. It cannot simply follow validity instead —
 * most validators here call an empty field invalid, so a form would greet you
 * with its errors already showing — so the rule is "while focused, or once
 * edited and not empty".
 *
 * That makes one-at-a-time something to enforce rather than something focus
 * happened to guarantee: each message is placed directly below its own field,
 * so two on a stacked form would put the upper one over the lower field.
 * Login is the stacked form in the app, and needs no account to reach.
 */
test('a form is quiet until typed in, then says one thing at a time', async ({
    page,
}) => {
    await page.goto('/en-US/login');
    const username = page.locator('#login-username-field');
    const password = page.locator('#login-password-field');
    await username.waitFor();

    // Both fields are invalid while empty, and neither says so.
    expect(await page.locator('.message:popover-open').count()).toBe(0);

    await username.fill('ab');
    await expect(page.locator('#login-username-field-error')).toBeVisible();

    // The username's message is sitting over the password field. It must not
    // swallow the press that focuses it — nothing in it is interactive.
    await password.click();
    await expect(password).toBeFocused();

    await password.fill('x');
    expect(await page.locator('.message:popover-open').count()).toBe(1);
    await expect(page.locator('#login-password-field-error')).toBeVisible();
});
