import { expect, test } from '../../playwright/fixtures';

/**
 * The on-stage key pad only exists on touch devices, so these run in a phone-
 * sized touch context — `'ontouchstart' in window` is what gates it, and a
 * desktop context never has it.
 *
 * What matters here is the pair: the pad appears AND the on-screen keyboard
 * is suppressed. Either alone is a worse experience than what we replaced.
 *
 * The touch context is spelled out rather than taken from a `devices[...]`
 * descriptor, because a phone descriptor carries two things that break the
 * WebKit run: `defaultBrowserType: 'chromium'`, which makes these tests launch
 * Chromium even under the webkit project (the nightly macOS runner installs
 * only WebKit, so they died at launch), and `isMobile`, which WebKit does not
 * support at all. `hasTouch` and a small viewport are the whole of what the pad
 * needs, and both engines take them — which matters here more than most, since
 * iOS Safari is the platform this feature exists for.
 */
test.use({ viewport: { width: 412, height: 839 }, hasTouch: true });

/** Gallery examples reach the player at this route without signing in. */
function example(id: string) {
    return `/project/example-${id}?mode=play`;
}

test('a project with known keys offers them as buttons instead of the keyboard', async ({
    page,
}) => {
    // Chimes' keys live in a table of structures reached through a helper,
    // so this also proves the analysis follows a value that far.
    await page.goto(example('Chimes'));
    const pad = page.locator('.key-pad');
    await pad.waitFor();

    await expect(pad.locator('.key')).toHaveText(['a', 's', 'd', 'f', 'g']);

    // The focus sink stays present and focusable so a physical keyboard still
    // works, but declares no input mode, which is what keeps the on-screen
    // keyboard away.
    await expect(page.locator('.keyboard-input')).toHaveAttribute(
        'inputmode',
        'none',
    );
});

test('tapping a key drives the program', async ({ page }) => {
    await page.goto(example('SlideShow'));
    const pad = page.locator('.key-pad');
    await pad.waitFor();

    const stage = page.locator('.value');
    await expect(stage).toContainText('1 of 10');

    // The last key is ArrowRight; tapping it should advance the slide, since
    // a tap routes through the same stream call a keypress does.
    await pad.locator('.key').last().tap();
    await expect(stage).toContainText('2 of 10');
});

test('a partly-bounded project offers the keys it knows AND keeps the keyboard', async ({
    page,
}) => {
    // Adventure guards on '1' and '2', then converts the key to a number to
    // index with — so the conversion could involve any key, but those two are
    // exactly what it is played with. Offering them is what makes it playable
    // on a touch screen; keeping the keyboard is what keeps the rest reachable.
    await page.goto(example('Adventure'));
    const pad = page.locator('.key-pad');
    await pad.waitFor();
    await expect(pad.locator('.key')).toHaveText(['1', '2']);
    await expect(page.locator('.keyboard-input')).not.toHaveAttribute(
        'inputmode',
        'none',
    );

    // And tapping one has to actually advance the story.
    const stage = page.locator('.value');
    await expect(stage).toContainText('dark, cold room');
    await pad.locator('.key').first().tap();
    await expect(stage).toContainText('knife');
});

test('a project with no bounded keys at all keeps only the keyboard', async ({
    page,
}) => {
    // French Numbers compares the CONVERTED key against a list access, so it
    // never compares the key itself to anything and there is nothing to offer.
    await page.goto(example('FrenchNumbers'));
    await page.locator('.value').waitFor();
    await expect(page.locator('.key-pad')).toHaveCount(0);
    await expect(page.locator('.keyboard-input')).not.toHaveAttribute(
        'inputmode',
        'none',
    );
});

test('the pad stays two rows tall however many keys a project uses', async ({
    page,
}) => {
    // Building Blocks needs eight keys; stacked, they covered the stage.
    await page.goto(example('BuildingBlocks'));
    const pad = page.locator('.key-pad');
    await pad.waitFor();
    await expect(pad.locator('.key')).toHaveCount(8);

    const padBox = await pad.boundingBox();
    const keyBox = await pad.locator('.key').first().boundingBox();
    expect(padBox).not.toBeNull();
    expect(keyBox).not.toBeNull();
    if (padBox === null || keyBox === null) return;
    // Two rows of keys plus the gap between them, with room to spare.
    expect(padBox.height).toBeLessThan(keyBox.height * 3);
});
