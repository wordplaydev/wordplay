import type { Page } from '@playwright/test';

/**
 * Walk the join flow to create a username-and-password account.
 *
 * Joining is four steps now (#628): where you live, when you were born, which
 * way you want to sign in, and then the credentials. The region and birthday
 * decide whether an email address is even offered — they are not stored — so a
 * test account has to answer them like anyone else.
 *
 * Shared by the worker-scoped auth fixture and loginNewContext, because both
 * drove the old two-field form and a change to this page otherwise breaks every
 * authenticated spec in the suite at once rather than one of them.
 */
export async function joinViaUI(
    page: Page,
    username: string,
    password: string,
): Promise<void> {
    await page.goto('/en-US/join');

    // Where. `US` keeps the age of consent at 13, so the birthday below is
    // unambiguously old enough and the flow reaches the choice step.
    await page.selectOption('#region-field', 'US');
    await page.getByTestId('join-next').click();

    // When. An adult birthday, so the email option is offered and this helper
    // exercises the same path a real creator takes.
    await page.locator('#birth-year-field').fill('1990');
    await page.selectOption('#birth-month-field', '1');
    await page.locator('#birth-day-field').fill('1');
    await page.getByTestId('join-next').click();

    // Which way. Move the pointer off first: the choice step puts "use a
    // password" almost exactly where this step's "next" button was, so the
    // mouse lands on it as it renders and Button's hover transform keeps
    // Playwright from ever seeing it settle.
    await page.mouse.move(0, 0);
    await page.getByTestId('join-use-password').click();

    await page.getByTestId('username-field').fill(username);
    await page.getByTestId('password-field').fill(password);
    await page.getByTestId('password-repeat-field').fill(password);
    await page.getByTestId('join-button').click();
    await page.waitForURL(/\/profile$/, { waitUntil: 'domcontentloaded' });
}
