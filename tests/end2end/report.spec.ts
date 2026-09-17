import { expect, test } from '@playwright/test';
import { loginNewContext } from '../helpers/loginNewContext';

/**
 * Reporting public content, and what a moderator does with it (#193).
 *
 * The seeded public projects belong to `creator`, and `mod` carries the `mod`
 * custom claim, so both halves of the flow have a real account behind them.
 */

const PublicProject = 'seed-project-00';

test('someone else’s public project can be reported, and the report jumps the moderation queue', async ({
    browser,
}) => {
    test.setTimeout(120000);

    // A viewer who isn't the project's creator.
    const viewer = await loginNewContext(browser, 'student1', 'password');
    try {
        await viewer.page.goto(`/en-US/project/${PublicProject}?mode=play`);
        const report = viewer.page.getByTestId('report-project');
        await expect(report).toBeVisible({ timeout: 30000 });

        // Two presses: the first arms it, the second sends it. No popup.
        await report.click();
        await viewer.page.getByTestId('report-project-confirm').click();
        // Once sent, it can't be sent again — reporting the same thing twice
        // adds nothing for a moderator and everything for a queue.
        await expect(report).toHaveAttribute('aria-disabled', 'true');
    } finally {
        await viewer.context.close();
    }

    // The moderator sees it first, ahead of the ordinary unmoderated queue.
    const mod = await loginNewContext(browser, 'moderator', 'password');
    try {
        // Reach the queue the way a moderator actually does: through the bell,
        // which is deliberately the only way in. Closing the dialog writes the
        // URL too, so closing before navigating used to supersede the
        // navigation — the dialog shut and the page stayed put.
        await mod.page.goto('/en-US/?dialog=notifications');
        const review = mod.page.getByTestId('notifications-moderate');
        // Waits out the moderator claim, which the button is gated on.
        await expect(review).toBeVisible({ timeout: 30000 });
        await review.click();
        await expect(mod.page).toHaveURL(/\/en-US\/moderate$/);

        await expect(mod.page.getByText(/reported this project/i)).toBeVisible({
            timeout: 30000,
        });

        // Exactly one title, here of all places: reviewing mounts ProjectView,
        // which names the tab itself, so the page withholds its own. Two would
        // race to name the tab, with no failure to say which won.
        await expect(mod.page.locator('head title')).toHaveCount(1);
    } finally {
        await mod.context.close();
    }
});

test('a creator cannot report their own project', async ({ browser }) => {
    // Its creators have the share dialog for anything wrong with it; reporting
    // is for the audience.
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await page.goto(`/en-US/project/${PublicProject}?mode=play`);
        // Anchor on the stage, not the editor: play mode renders no editor at
        // all, so waiting for one waited out the timeout on every run.
        await expect(page.getByTestId('output').first()).toBeVisible({
            timeout: 30000,
        });
        await expect(page.getByTestId('report-project')).toHaveCount(0);
    } finally {
        await context.close();
    }
});
