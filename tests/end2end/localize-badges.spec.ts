import {
    expect,
    test,
    type Locator,
    type Page,
} from '../../playwright/fixtures';
import {
    enUS,
    localizeButton,
    localizeOn,
    settled,
    text,
} from '../helpers/localize';

/**
 * Localization mode's 💭 tip badges are pinned to their control's corner rather
 * than sitting in flow, so turning the mode on must not resize the controls they
 * annotate. These measure that directly. Controls whose visible *label* is itself
 * editable do legitimately grow (the label becomes a button), so the subjects here
 * are all label-less: an icon-only Button, a Toggle, and a TextField.
 */

/** The toggle whichever mode it's currently in, for measuring it. */
function localizeButtonEitherState(page: Page) {
    return page
        .getByRole('button', {
            name: new RegExp(
                `${text(enUS.ui.localize.toggle.mode.off)}|${text(
                    enUS.ui.localize.toggle.mode.on,
                )}`.replace(/[.*+?^${}()|[\]\\]/g, (c) =>
                    c === '|' ? '|' : `\\${c}`,
                ),
            ),
        })
        .first();
}

/** The group wrapping that button, which is what the badges pin to. */
function localizeGroup(page: Page, state: 'on' | 'off') {
    return localizeButton(page, state).locator(
        'xpath=ancestor::span[contains(@class,"toggle-group")][1]',
    );
}

/**
 * A bounding box read only once it has stopped changing.
 *
 * The footer's overflow toolbar measures itself and moves controls in and out as
 * it settles, so a box read on the first paint is a layout still in progress —
 * measured mid-compaction, the localize toggle sits about 50px right of where it
 * ends up, which is enough to fail an assertion about where its badges pin.
 */
async function settledBox(locator: Locator) {
    await expect(locator).toBeVisible({ timeout: 20000 });
    let previous: string | undefined;
    await expect
        .poll(
            async () => {
                const box = await locator.boundingBox();
                const current = JSON.stringify(box);
                const stable = current === previous;
                previous = current;
                return stable && box !== null;
            },
            { timeout: 20000 },
        )
        .toBe(true);
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return box!;
}

async function size(locator: Locator) {
    // Wait for the element itself, not merely for the absence of loading
    // markers: an "is nothing loading" check is satisfied before anything has
    // rendered at all.
    // Generous: the footer's overflow toolbar measures itself and can move
    // controls in and out while the page around it is still settling.
    await expect(locator).toBeVisible({ timeout: 20000 });
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
    await settled(page);

    const gear = page.getByRole('button', { name: 'show settings dialog' });
    // Located by accessible name, not by the ✎ glyph: project cards use the
    // same glyph and precede the footer, so a glyph locator measures a card.
    const toggle = localizeButtonEitherState(page);
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
    // A page with no project-dependent content: this measures where the badges
    // sit on the footer toggle, and on /projects the number of project cards
    // the shared worker account happens to own reflows the footer around it.
    await page.goto('/en-US/about');
    await localizeOn(page);

    // The localize toggle itself has an on tip and an off tip.
    const group = localizeGroup(page, 'on');
    const badges = group.locator('.tip-badge');
    await expect(badges).toHaveCount(2);

    // Read all three only once the toolbar around them has stopped moving.
    const groupBox = await settledBox(group);
    const first = await settledBox(badges.nth(0));
    const second = await settledBox(badges.nth(1));

    // One on each side, both at the block start, both overhanging the corner.
    expect(first.x).toBeLessThan(second.x);
    expect(first.x).toBeLessThan(groupBox.x + groupBox.width / 2);
    expect(second.x + second.width).toBeGreaterThan(
        groupBox.x + groupBox.width / 2,
    );
    expect(first.y).toBeLessThan(groupBox.y);
    expect(second.y).toBeLessThan(groupBox.y);
});
