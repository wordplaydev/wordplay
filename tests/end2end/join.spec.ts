import { expect, test } from '@playwright/test';

/**
 * Joining (#628).
 *
 * Four steps — where you live, when you were born, which way to sign in, and
 * the credentials — because the age at which someone may consent to us holding
 * an email address differs by country, and a yes/no age question can't tell us
 * when a young creator stops being a no.
 */

const AUTH = 'http://127.0.0.1:9099';
const PROJECT = 'demo-wordplay';

/** Walk to the choice step with an adult birthday in the US. */
async function reachChoice(page: import('@playwright/test').Page) {
    await page.goto('/en-US/join');
    await expect(page.locator('#region-field')).toBeVisible({ timeout: 15000 });
    await page.selectOption('#region-field', 'US');
    await page.getByTestId('join-next').click();
    await page.locator('#birth-year-field').fill('1990');
    await page.selectOption('#birth-month-field', '1');
    await page.locator('#birth-day-field').fill('1');
    await page.getByTestId('join-next').click();
    // The pointer would otherwise land on the button appearing where the last
    // one was, and Button's hover transform keeps it from settling.
    await page.mouse.move(0, 0);
    await expect(page.getByTestId('join-use-password')).toBeVisible();
}

test('the country starts at the one this locale names', async ({ page }) => {
    // A guess that saves nearly everyone a scroll through 250 countries. The
    // answer is never stored — only the eligibility date derived from it.
    await page.goto('/en-US/join');
    await expect(page.locator('#region-field')).toHaveValue('US', {
        timeout: 15000,
    });
});

test('January can be chosen without picking another month first', async ({
    page,
}) => {
    // A <select> with nothing selected displays its first option, so a month
    // list beginning at January showed January while the answer was still
    // empty — and re-picking January fires no change event, leaving no way
    // forward. The empty leading option is what makes the control tell the
    // truth about what has been answered.
    await page.goto('/en-US/join');
    await expect(page.locator('#region-field')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('join-next').click();

    await expect(page.locator('#birth-month-field')).toHaveValue('');

    await page.locator('#birth-year-field').fill('1990');
    await page.locator('#birth-day-field').fill('15');
    // Still incomplete: a birthday must never be pre-filled with a month
    // nobody chose.
    await expect(page.getByTestId('join-next')).toHaveAttribute(
        'aria-disabled',
        'true',
    );

    // One deliberate choice of January, and that is enough.
    await page.selectOption('#birth-month-field', '1');
    await expect(page.getByTestId('join-next')).toHaveAttribute(
        'aria-disabled',
        'false',
    );
});

test('an impossible birthday is refused on the field that is wrong', async ({
    page,
}) => {
    await page.goto('/en-US/join');
    await expect(page.locator('#region-field')).toBeVisible({ timeout: 15000 });
    await page.getByTestId('join-next').click();

    // February 30th, in a leap year — so the 29th below is genuinely valid and
    // this tests the calendar rather than a range check. The day is the part
    // that has to change, so that is where the message belongs, rather than in
    // a paragraph underneath the three fields.
    await page.locator('#birth-year-field').fill('2012');
    await page.selectOption('#birth-month-field', '2');
    await page.locator('#birth-day-field').fill('30');
    await page.locator('#birth-year-field').click();

    await expect(page.getByTestId('join-next')).toHaveAttribute(
        'aria-disabled',
        'true',
    );

    // And the 29th of a leap year is fine, which a range check alone would not
    // get right — nor would one that refused every February 29th.
    await page.locator('#birth-day-field').fill('29');
    await expect(page.getByTestId('join-next')).toHaveAttribute(
        'aria-disabled',
        'false',
    );
});

test('joining with an email address sends a real sign-in link', async ({
    page,
}) => {
    test.setTimeout(90000);
    const email = `join-${Date.now()}@wordplay.dev`;
    const username = `joiner${Date.now().toString().slice(-6)}`;

    await reachChoice(page);
    await page.getByTestId('join-use-email').click();

    await page.getByTestId('username-field').fill(username);
    await page.locator('#join-email-field').fill(email);
    await page.getByTestId('join-button').click();

    // The same confirmation whether or not that address already had an
    // account: this page never says which.
    await expect(page.getByText(/link is on its way/i)).toBeVisible({
        timeout: 30000,
    });

    // The link is real. `sendSigninEmail` doesn't post anything in the
    // emulator, but `generateSignInWithEmailLink` has still registered an
    // oobCode — which is what proves the callable got all the way through
    // rather than failing quietly on the locale fetch.
    const codes: { oobCodes?: { email: string }[] } = await (
        await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`)
    ).json();
    expect(codes.oobCodes?.some((code) => code.email === email)).toBe(true);
});

test('someone too young is never offered an email address', async ({
    page,
}) => {
    await page.goto('/en-US/join');
    await expect(page.locator('#region-field')).toBeVisible({ timeout: 15000 });
    await page.selectOption('#region-field', 'DE');
    await page.getByTestId('join-next').click();

    // Fourteen in Germany, where the age of consent is 16.
    const year = new Date().getUTCFullYear() - 14;
    await page.locator('#birth-year-field').fill(String(year));
    await page.selectOption('#birth-month-field', '1');
    await page.locator('#birth-day-field').fill('1');
    await page.getByTestId('join-next').click();

    // Straight past the choice, to a username and password — and no email
    // field anywhere.
    await expect(page.getByTestId('username-field')).toBeVisible();
    await expect(page.getByTestId('join-use-email')).toHaveCount(0);
    await expect(page.locator('#join-email-field')).toHaveCount(0);
});

test('a creator too young for an email address is not offered one on their profile', async ({
    page,
}) => {
    test.setTimeout(90000);
    const username = `young${Date.now().toString().slice(-7)}`;

    // Fourteen in Germany, where the age of consent is 16.
    await page.goto('/en-US/join');
    await expect(page.locator('#region-field')).toBeVisible({ timeout: 15000 });
    await page.selectOption('#region-field', 'DE');
    await page.getByTestId('join-next').click();
    await page
        .locator('#birth-year-field')
        .fill(String(new Date().getUTCFullYear() - 14));
    await page.selectOption('#birth-month-field', '1');
    await page.locator('#birth-day-field').fill('1');
    await page.getByTestId('join-next').click();

    await page.getByTestId('username-field').fill(username);
    await page.getByTestId('password-field').fill('password');
    await page.getByTestId('password-repeat-field').fill('password');
    await page.getByTestId('join-button').click();
    await page.waitForURL(/\/profile$/, { waitUntil: 'domcontentloaded' });

    // The offer must not appear and then be withdrawn a sentence later: "if
    // you'd rather not have a password" is not something to say to someone who
    // has no choice about it. One message per case.
    await expect(page.getByText(/not old enough yet/i)).toBeVisible({
        timeout: 20000,
    });
    await expect(page.getByText(/rather not have a password/i)).toHaveCount(0);
    await expect(page.locator('#switch-email-field')).toHaveCount(0);

    // And it says *when*, rather than deferring with "one day". A fourteen
    // year old in Germany becomes eligible at sixteen, so the year is two
    // birthdays out — a date the creator can check for themselves.
    const eligibleYear = new Date().getUTCFullYear() + 2;
    await expect(
        page.getByText(new RegExp(String(eligibleYear))),
    ).toBeVisible();
});
