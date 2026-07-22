import fs from 'fs';
import path from 'path';
import type LocaleText from '../../src/locale/LocaleText';
import { expect, test } from '../../playwright/fixtures';

/**
 * Each locale's `guidance` is original content in that locale's own language,
 * not a translation of the English, so it lives in its own block on the
 * workspace rather than in the list of translatable strings. These tests pin
 * that split, plus the edit round trip into the submission bundle.
 *
 * Expected labels are read from the locale files rather than hard-coded: the
 * UI strings around guidance are translated per locale, so a literal English
 * string would only pass on en-US.
 */

/** Drop a leading write-status annotation ($?, $!, $~) the way the app does. */
function text(value: string) {
    return value.replace(/^\$[?!~]/, '');
}

/** Read a locale file from disk; JSON imports need import attributes under the
 *  runner's ESM loader, and this keeps the specs on the shipped strings. */
function localeText(locale: string): LocaleText {
    const file =
        locale === 'en-US'
            ? path.resolve('src', 'locale', 'en-US.json')
            : path.resolve('static', 'locales', locale, `${locale}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const enUS = localeText('en-US');
const esMX = localeText('es-MX');
const svSE = localeText('sv-SE');

test('workspace shows this locale s guidance, not the English one', async ({
    page,
}) => {
    await page.goto('/es-MX/localize');

    await expect(
        page.getByRole('heading', { name: text(esMX.ui.localize.guidance) }),
    ).toBeVisible({ timeout: 15000 });

    // The es-MX guidance, not en-US's.
    await expect(
        page.getByText('Dirígete a quien aprende de tú'),
    ).toBeVisible();
    await expect(page.getByText('Write short, plain')).toHaveCount(0);
});

test('guidance is absent from the translatable string list', async ({
    page,
}) => {
    await page.goto('/en-US/localize');

    await expect(
        page.getByRole('heading', { name: enUS.ui.localize.guidance }),
    ).toBeVisible({ timeout: 15000 });

    // Searching for it finds nothing: it isn't one of the strings to translate.
    await page.locator('#localize-filter').fill('guidance');
    await expect(page.getByText('.guidance')).toHaveCount(0);
});

test('localization mode panel offers guidance, prompting when it is empty', async ({
    page,
}) => {
    // sv-SE has no guidance written yet, so the panel should invite some.
    await page.goto('/sv-SE/projects');

    // The footer toggle is found by its accessible name — in Swedish, since that's
    // the chosen locale here — and NOT by its ✎ glyph: every owned project card on
    // /projects renders an edit button with the same glyph ahead of the footer in
    // DOM order, so a glyph locator opens a project instead of toggling the mode as
    // soon as this worker's account owns one (see localize-badges.spec.ts).
    await page
        .getByRole('button', { name: text(svSE.ui.localize.toggle.mode.off) })
        .click();
    // Assert the panel arrived before reaching into it, so a regression in the mode
    // toggle fails here in seconds rather than timing out on the switch below. By
    // class, not text: in localization mode every label carries an edit badge, so
    // the panel's heading has no stable accessible name.
    await expect(page.locator('.guidance-toggle')).toBeVisible();

    // The guidance switch is found by class: its labels are Swedish here.
    await page.locator('.guidance-toggle .switch .button.on').click();

    await expect(
        page.getByText(text(svSE.ui.localize.guidanceEmpty)),
    ).toBeVisible();
});

test('editing guidance queues an edit in the submission bundle', async ({
    page,
}) => {
    await page.goto('/en-US/localize');

    await expect(
        page.getByRole('heading', { name: enUS.ui.localize.guidance }),
    ).toBeVisible({ timeout: 15000 });

    await page
        .getByRole('button', { name: enUS.ui.localize.button.edit })
        .first()
        .click();

    // The id lands on the FormattedEditor's wrapper; the textarea is inside it.
    const field = page.locator('#localize-guidance-field textarea');
    await expect(field).toBeVisible();
    await field.fill('•Keep sentences short.');
    await page
        .getByRole('button', { name: enUS.ui.localize.button.submit })
        .first()
        .click();

    // The edit is now in the bundle, keyed by the guidance path.
    await expect(page.getByText('Keep sentences short.').first()).toBeVisible();
    await expect(page.getByText('.guidance').first()).toBeVisible();
});
