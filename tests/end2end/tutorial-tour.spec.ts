import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from '../helpers/checkAccessibility';

/**
 * Where a lesson would have described the interface, it hands the learner to
 * the tour that shows it, and holds the next control until that tour has been
 * taken (#984). The gate is what makes the hand-off more than a suggestion, so
 * it is what this covers: that it holds, that taking the tour releases it, that
 * it stays released, and that there is always a way past it.
 */

/** The first lesson that points at a tour: Program introducing the editor. The
 *  mode is explicit so the page doesn't stop at the tutorial chooser. */
const Orientation = '/en-US/learn?tutorial=complete&act=1&scene=2&pause=5';

const next = 'next pause in dialog';
const skip = 'skip the tour and keep going';

/** Wait for the lesson's dialog to render before touching its controls. */
async function openLesson(page: import('@playwright/test').Page, url: string) {
    await page.goto(url);
    await expect(page.getByRole('article').first()).toBeVisible({
        timeout: 30000,
    });
}

test('a lesson that points at a tour holds until the tour is taken', async ({
    page,
}) => {
    await openLesson(page, Orientation);

    const advance = page.getByRole('button', { name: next });
    await expect(advance).toHaveAttribute('aria-disabled', 'true');

    // The tour is offered in the sentence that would otherwise have described
    // the editor, and starting it lands focus inside the tour.
    const start = page.locator('[data-uiid="tourLink"]');
    await expect(start).toBeVisible();
    await start.click();

    const tour = page.getByRole('dialog', { name: 'tour' });
    await expect(tour).toBeVisible();
    await expect(tour).toContainText('1/');

    // Arrow keys step it, and Escape closes it.
    await page.keyboard.press('ArrowRight');
    await expect(tour).toContainText('2/');
    await page.keyboard.press('Escape');
    await expect(tour).toBeHidden();

    // Taken: the lesson goes on, and focus comes back to the way forward.
    await expect(advance).toHaveAttribute('aria-disabled', 'false');
    await expect(advance).toBeFocused();

    // And it stays taken — coming back to the lesson doesn't ask again.
    await openLesson(page, Orientation);
    await expect(page.getByRole('button', { name: next })).toHaveAttribute(
        'aria-disabled',
        'false',
    );
});

test('a learner can always get past the gate without taking the tour', async ({
    page,
}) => {
    await openLesson(page, Orientation);

    const advance = page.getByRole('button', { name: next });
    await expect(advance).toHaveAttribute('aria-disabled', 'true');

    // Trying to advance says why rather than doing nothing silently. The key is
    // what's tested rather than the button: an inactive Button never runs its
    // action, and a screen reader reads that control as dimmed on the way to it.
    await advance.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.announcements.immediate')).not.toHaveText('');
    await expect(advance).toHaveAttribute('aria-disabled', 'true');

    await page.getByRole('button', { name: skip }).click();
    await expect(advance).toHaveAttribute('aria-disabled', 'false');
    await expect(page.getByRole('button', { name: skip })).toHaveCount(0);
});

/**
 * Two surfaces no route scan reaches: a lesson holding its next control, and a
 * tour overlay open over it. Both are chrome the tutorial now routinely shows,
 * and the overlay in particular paints a dimming cutout over the whole viewport
 * and traps focus, so it is worth checking in both schemes rather than assuming
 * the tile's ⓘ button was ever scanned.
 */
for (const scheme of ['light', 'dark'] as const) {
    test.describe(`the gate and the tour it opens (${scheme})`, () => {
        test.use({ colorScheme: scheme });

        test('have no WCAG 2.2 AA violations', async ({ page }) => {
            await openLesson(page, Orientation);
            await expectNoAxeViolations(page);

            await page.locator('[data-uiid="tourLink"]').click();
            await expect(
                page.getByRole('dialog', { name: 'tour' }),
            ).toBeVisible();
            await expectNoAxeViolations(page);
        });
    });
}
