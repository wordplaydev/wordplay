import fs from 'fs';
import path from 'path';
import type LocaleText from '../../src/locale/LocaleText';
import { expect, test, type Locator, type Page } from '../../playwright/fixtures';

/**
 * Localization mode's 💭 tip badges are pinned to their control's corner rather
 * than sitting in flow, so turning the mode on must not resize the controls they
 * annotate. These measure that directly. Controls whose visible *label* is itself
 * editable do legitimately grow (the label becomes a button), so the subjects here
 * are all label-less: an icon-only Button, a Toggle, and a TextField.
 */

/** Drop a leading write-status annotation ($?, $!, $~) the way the app does. */
function text(value: string) {
    return value.replace(/^\$[?!~]/, '');
}

const enUS: LocaleText = JSON.parse(
    fs.readFileSync(path.resolve('src', 'locale', 'en-US.json'), 'utf8'),
);

/**
 * Localization mode is per page load. Returns once the mode is on.
 *
 * The footer toggle is found by its accessible name, NOT by its ✎ glyph: every
 * owned project card on /projects renders an edit button with the same glyph, and
 * those precede the footer in DOM order. A glyph locator therefore opens a project
 * instead of toggling the mode as soon as the account owns one — which is
 * whenever another spec sharing this worker's account has created a project.
 */
async function localizeOn(page: Page) {
    await page
        .getByRole('button', {
            name: text(enUS.ui.localize.toggle.mode.off),
        })
        .click();
    await expect(page.getByText('Localize', { exact: true })).toBeVisible();
}

async function size(locator: Locator) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    // Width and height only: the mode's header banner shifts everything down the
    // page, which is expected and not what's under test.
    return { width: box!.width, height: box!.height };
}

test('turning on localization mode does not resize the controls it annotates', async ({
    page,
}) => {
    await page.goto('/en-US/projects');

    const gear = page.getByRole('button', { name: 'show settings dialog' });
    const toggle = page
        .locator('.toggle-group')
        .filter({ hasText: '✎' })
        .first()
        // The toggle's own button, which precedes the badge buttons the mode adds.
        .locator('button')
        .first();
    const field = page.locator('#project-search');

    await expect(gear).toBeVisible();
    const before = {
        gear: await size(gear),
        toggle: await size(toggle),
        field: await size(field),
    };

    await localizeOn(page);

    expect(await size(gear)).toEqual(before.gear);
    expect(await size(toggle)).toEqual(before.toggle);
    expect(await size(field)).toEqual(before.field);
});

test('a two-tip control pins one badge to each block-start corner', async ({
    page,
}) => {
    await page.goto('/en-US/projects');
    await localizeOn(page);

    // The localize toggle itself has an on tip and an off tip.
    const group = page
        .locator('.toggle-group')
        .filter({ hasText: '✎' })
        .first();
    const groupBox = (await group.boundingBox())!;
    const badges = group.locator('.tip-badge');
    await expect(badges).toHaveCount(2);

    const first = (await badges.nth(0).boundingBox())!;
    const second = (await badges.nth(1).boundingBox())!;

    // One on each side, both at the block start, both overhanging the corner.
    expect(first.x).toBeLessThan(second.x);
    expect(first.x).toBeLessThan(groupBox.x + groupBox.width / 2);
    expect(second.x + second.width).toBeGreaterThan(
        groupBox.x + groupBox.width / 2,
    );
    expect(first.y).toBeLessThan(groupBox.y);
    expect(second.y).toBeLessThan(groupBox.y);
});
