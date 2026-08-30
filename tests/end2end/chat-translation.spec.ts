import { expect, test } from '@playwright/test';
import { loginNewContext } from '../helpers/loginNewContext';

const LOAD_TIMEOUT = 30000;

/**
 * Choosing a language has to actually start a translation (#1214).
 *
 * This is the regression that made the whole feature inert, in every browser
 * and every conversation, while looking perfectly healthy: the effect that
 * schedules a pass cleared any pending timeout on its way past, and it re-runs
 * for reasons unrelated to the conversation's content. A re-run inside the
 * 300ms debounce window cancelled the scheduled pass, recomputed the same
 * content key, and returned early without setting another one. Nothing threw,
 * nothing was logged, and the picker sat there having done nothing.
 *
 * So this asserts the pass *starts* rather than that it finishes: completing
 * needs the translation callable, which has no API key in the emulator. The
 * spinner is the observable that the effect actually fired.
 */
test('choosing a language starts translating, and stopping is only offered while it runs', async ({
    browser,
}) => {
    const { context, page } = await loginNewContext(
        browser,
        'creator',
        'password',
    );
    try {
        await page.goto('/en-US/project/seed-collab-project');
        await expect(page.locator('#project-name')).toHaveValue(
            'Shared Sketch',
            { timeout: LOAD_TIMEOUT },
        );
        await page.getByTestId('collaborate-toggle').click();

        // The seeded conversation carries a message from the *other* creator.
        // A reader's own messages are never translated, so a chat holding only
        // your own has nothing to do and would prove nothing here.
        await expect(page.getByText('Added a phrase')).toBeVisible({
            timeout: LOAD_TIMEOUT,
        });

        const stop = page.getByRole('button', { name: /stop translating/i });
        // Nothing is running, so there is nothing to stop. It used to sit here
        // permanently, which read as the only way to undo a choice the picker
        // had already made.
        await expect(stop).toHaveCount(0);

        await page
            .locator('select[id$="-translate"]')
            .first()
            .selectOption({ label: 'español' });

        // The spinner lives in the status row under the controls, where what
        // is merely happening can grow without moving the pickers.
        await expect(page.locator('.chat-status [role="status"]')).toBeVisible({
            timeout: 15000,
        });
        await expect(stop).toHaveCount(1);
    } finally {
        await context.close();
    }
});
