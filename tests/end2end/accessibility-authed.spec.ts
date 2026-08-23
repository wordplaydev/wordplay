import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from '../helpers/checkAccessibility';
import { createTestCharacter } from '../helpers/createCharacter';
import { editTrianglePoints } from '../helpers/drawCharacterPath';
import { loginNewContext } from '../helpers/loginNewContext';

/**
 * The axe gate for authenticated and content-heavy views: the projects list,
 * an open project editor with its output stage, the character editor, and a
 * tutorial lesson, in both color schemes. Uses the seeded `creator` account
 * so the scanned content is deterministic. Stage output is deliberately IN
 * scope — see accessibility.spec.ts for the policy.
 */

const LOAD_TIMEOUT = 30_000;

for (const scheme of ['light', 'dark'] as const) {
    test.describe(`authed views (${scheme})`, () => {
        test(`projects list has no WCAG 2.2 AA violations`, async ({
            browser,
        }) => {
            const { context, page } = await loginNewContext(
                browser,
                'creator',
                'password',
                { colorScheme: scheme },
            );
            try {
                await page.goto('/en-US/projects');
                await expect(page.getByTestId('preview').first()).toBeVisible({
                    timeout: LOAD_TIMEOUT,
                });
                await expectNoAxeViolations(page);
            } finally {
                await context.close();
            }
        });

        test(`project editor has no WCAG 2.2 AA violations`, async ({
            browser,
        }) => {
            const { context, page } = await loginNewContext(
                browser,
                'creator',
                'password',
                { colorScheme: scheme },
            );
            try {
                await page.goto('/en-US/project/seed-collab-project');
                // The name only resolves once cloud sync has, so it doubles as
                // the loaded signal (see seeded-load.spec.ts).
                await expect(page.locator('#project-name')).toHaveValue(
                    'Shared Sketch',
                    { timeout: LOAD_TIMEOUT },
                );
                await expect(page.getByTestId('editor').first()).toBeVisible();
                // Let the evaluator settle into its (reduced-motion) steady
                // state before sampling colors.
                await page.waitForTimeout(1000);
                await expectNoAxeViolations(page, { verbose: true });
            } finally {
                await context.close();
            }
        });

        test(`languages dialog has no WCAG 2.2 AA violations`, async ({
            browser,
        }) => {
            // The translate tab carries a progress bar and a budget meter, both
            // of which need an accessible name and AA-contrast text in both
            // schemes, and neither is reachable from the editor scan above.
            const { context, page } = await loginNewContext(
                browser,
                'creator',
                'password',
                { colorScheme: scheme },
            );
            try {
                await page.goto('/en-US/project/seed-collab-project');
                await expect(page.locator('#project-name')).toHaveValue(
                    'Shared Sketch',
                    { timeout: LOAD_TIMEOUT },
                );
                await page
                    .locator('[data-uiid="languagesButton"] button')
                    .first()
                    .click();
                await page.getByRole('tab').nth(1).click();
                await expect(
                    page.locator('#languages-tabs-panel'),
                ).toBeVisible();
                await expectNoAxeViolations(page);
            } finally {
                await context.close();
            }
        });

        test(`character editor has no WCAG 2.2 AA violations`, async ({
            browser,
        }) => {
            const { context, page } = await loginNewContext(
                browser,
                'creator',
                'password',
                { colorScheme: scheme },
            );
            try {
                await page.goto('/en-US/characters');
                const first = page.locator('a[href*="/character/"]').first();
                await expect(first).toBeVisible({ timeout: LOAD_TIMEOUT });
                await first.click();
                await page.waitForURL(/\/character\/[^/]+$/);
                await expect(page.getByRole('application').first()).toBeVisible(
                    { timeout: LOAD_TIMEOUT },
                );
                await expectNoAxeViolations(page);
            } finally {
                await context.close();
            }
        });

        /**
         * The image importer's crop region is a role="application" the creator
         * drives with the keyboard, and it only renders once its mode is chosen.
         */
        test(`the character image importer has no WCAG 2.2 AA violations`, async ({
            browser,
        }) => {
            const { context, page } = await loginNewContext(
                browser,
                'creator',
                'password',
                { colorScheme: scheme },
            );
            try {
                await createTestCharacter(page);
                await page
                    .getByRole('radio', { name: 'image', exact: true })
                    .click();
                await expect(
                    page
                        .getByRole('button', { name: /choose an image file/i })
                        .first(),
                ).toBeVisible({ timeout: LOAD_TIMEOUT });
                await expectNoAxeViolations(page);
            } finally {
                await context.close();
            }
        });

        /**
         * Opening a character is not enough to reach the point handles: they need
         * a path, and they bring their own overlay and toolbar with them. A
         * freshly drawn triangle is the smallest state that renders all of it.
         */
        test(`character point editing has no WCAG 2.2 AA violations`, async ({
            browser,
        }) => {
            const { context, page } = await loginNewContext(
                browser,
                'creator',
                'password',
                { colorScheme: scheme },
            );
            try {
                await createTestCharacter(page);
                await editTrianglePoints(page);
                await expectNoAxeViolations(page);
            } finally {
                await context.close();
            }
        });
    });

    test.describe(`tutorial (${scheme})`, () => {
        test.use({ colorScheme: scheme });

        test(`tutorial lesson has no WCAG 2.2 AA violations`, async ({
            page,
        }) => {
            await page.goto('/en-US/learn');
            // Choose the quick tutorial (if the chooser is showing) and wait
            // for the first lesson's dialog turn to render.
            const quick = page.getByRole('button', { name: 'Quick' });
            await expect(quick).toBeVisible({ timeout: LOAD_TIMEOUT });
            await quick.click();
            await expect(page.getByRole('article').first()).toBeVisible({
                timeout: LOAD_TIMEOUT,
            });
            await expectNoAxeViolations(page, { verbose: true });
        });
    });
}
