import fs from 'fs';
import path from 'path';
import { expect, type Page } from '@playwright/test';
import type LocaleText from '../../src/locale/LocaleText';

/** Drop a leading write-status annotation ($?, $!, $~) the way the app does. */
export function text(value: string) {
    return value.replace(/^\$[?!~]/, '');
}

/** en-US, so a spec can assert on the locale's own words rather than hard-coded English. */
export const enUS: LocaleText = JSON.parse(
    fs.readFileSync(path.resolve('src', 'locale', 'en-US.json'), 'utf8'),
);

/**
 * The footer's localize toggle button, found by its accessible name rather than by its ✎
 * glyph: every owned project card on /projects renders an edit button with the same glyph and
 * those precede the footer in DOM order, so a glyph locator opens a project instead of
 * toggling the mode as soon as the account owns one.
 */
export function localizeButton(page: Page, state: 'on' | 'off') {
    return page.getByRole('button', {
        name: text(enUS.ui.localize.toggle.mode[state]),
    });
}

/**
 * Wait for markup that embeds code to finish arriving. Examples, node references, and values
 * load the language runtime on demand and show a stand-in until it lands (see
 * SegmentHTMLView), so a box measured before then is a layout still one chunk away from final.
 */
export async function settled(page: Page) {
    await expect(page.locator('.rich-loading')).toHaveCount(0);
}

/**
 * Localization mode is per page load. Returns once the mode is on.
 *
 * Idempotent: these specs share an authenticated account, so the mode may already be on from
 * a sibling test and clicking again would turn it off. Waits for the toggle in either state
 * first — `count()` doesn't wait, so asking before the footer renders reads zero and skips
 * the click.
 */
export async function localizeOn(page: Page) {
    const enter = localizeButton(page, 'off');
    const leave = localizeButton(page, 'on');
    await expect(enter.or(leave)).toBeVisible({ timeout: 20000 });
    if ((await leave.count()) === 0) await enter.click();
    await expect(page.getByText('Localize', { exact: true })).toBeVisible();
    await settled(page);
}

/** Turn the mode off if it's on, so a following test starts from the plain UI. */
export async function localizeOff(page: Page) {
    const leave = localizeButton(page, 'on');
    if ((await leave.count()) > 0) await leave.click();
    await expect(localizeButton(page, 'off')).toBeVisible();
}
