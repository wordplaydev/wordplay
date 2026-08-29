import fs from 'fs';
import path from 'path';
import type LocaleText from '../../src/locale/LocaleText';
import { expect, test } from '../../playwright/fixtures';

/**
 * A glossary term's other written forms are that locale's own — the plurals,
 * conjugations, and synonyms a reference to the term may use — so they live on
 * their own tab rather than in the list of strings to translate, and a locale
 * that has never had any can still add one (#1244).
 *
 * Expected labels are read from the locale files rather than hard-coded, since
 * the UI around them is translated per locale.
 */

/** Drop a leading write-status annotation ($?, $!, $~) the way the app does. */
function text(value: string) {
    return value.replace(/^\$[?!~]/, '');
}

function localeText(locale: string): LocaleText {
    const file =
        locale === 'en-US'
            ? path.resolve('src', 'locale', 'en-US.json')
            : path.resolve('static', 'locales', locale, `${locale}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const enUS = localeText('en-US');
const esMX = localeText('es-MX');

/** The accessible name of the workspace's nth tab. */
function tabLabel(locale: LocaleText, index: number) {
    return text(locale.ui.page.localize.tabs.labels[index]);
}

/** The literal run of a templated message, up to its first input. Lets a test
 *  match on the locale's own words rather than a hard-coded English phrase. */
function beforeInput(template: string) {
    return text(template).split('$')[0].trim();
}

test('a term’s forms are absent from the list of strings to translate', async ({
    page,
}) => {
    await page.goto('/en-US/localize');

    await page.getByRole('tab', { name: tabLabel(enUS, 1) }).click();

    // en-US is the one locale that already has forms, so without the exclusion
    // they would show here as a positional tuple — and a per-index edit could
    // then collide with a whole-list one in the same bundle.
    await page.locator('#localize-filter').fill('forms');
    await expect(page.getByText('glossary.parameter.forms')).toHaveCount(0);
});

test('a locale with no forms can add one, and it queues in the bundle', async ({
    page,
}) => {
    await page.goto('/es-MX/localize');

    await page.getByRole('tab', { name: tabLabel(esMX, 3) }).click();

    // Scoped to this term's own row: every one of the glossary's terms renders
    // an add field and button, so an unscoped locator finds the first term's.
    const term = page
        .locator('li.term')
        .filter({ has: page.locator('#glossary-form-parameter') });

    // No locale but en-US ships any forms, so this term starts empty.
    const field = term.locator('#glossary-form-parameter');
    await expect(field).toBeVisible({ timeout: 15000 });
    await field.fill('parámetros');
    await term
        .getByRole('button', { name: text(esMX.ui.localize.glossary.add) })
        .click();

    // The form shows in place...
    await expect(term.getByText('parámetros')).toBeVisible();

    // ...and is queued in the bundle on the Submit tab, reading as words rather
    // than as the list the wire carries.
    await page.getByRole('tab', { name: tabLabel(esMX, 4) }).click();
    await expect(
        page.getByText('glossary.parameter.forms').first(),
    ).toBeVisible();
    await expect(page.getByText('parámetros').first()).toBeVisible();
});

test('a form another term already owns is refused', async ({ page }) => {
    await page.goto('/en-US/localize');

    await page.getByRole('tab', { name: tabLabel(enUS, 3) }).click();

    const term = page
        .locator('li.term')
        .filter({ has: page.locator('#glossary-form-parameter') });
    const field = term.locator('#glossary-form-parameter');
    await expect(field).toBeVisible({ timeout: 15000 });
    // "value" is another term's word, so a reference to it would be ambiguous —
    // a hard error in the locale verifier, and so caught here before submitting.
    await field.fill('value');

    await expect(
        term.getByText(beforeInput(enUS.ui.localize.glossary.otherWord), {
            exact: false,
        }),
    ).toBeVisible();
    // The add button stays focusable — it reports its state with aria-disabled
    // rather than `disabled`, so a screen reader can still find it.
    await expect(
        term.getByRole('button', {
            name: text(enUS.ui.localize.glossary.add),
        }),
    ).toHaveAttribute('aria-disabled', 'true');
});

test('a term’s word and definition are editable where the term is shown', async ({
    page,
}) => {
    await page.goto('/en-US/localize');
    await page.getByRole('tab', { name: tabLabel(enUS, 3) }).click();

    // Edit badges exist only in localization mode, and every page load starts
    // out of it (the layout's `localizing` state isn't persisted).
    await page
        .getByRole('button', { name: text(enUS.ui.localize.toggle.mode.off) })
        .click();

    const term = page
        .locator('li.term')
        .filter({ has: page.locator('#glossary-form-parameter') });

    // Neither field can be addressed by a literal accessor — the term id is
    // dynamic — so both go through the explicit override-key pair. The word is
    // the heading; the definition is the markup beside it.
    await term
        .locator('h3')
        .getByRole('button', { name: text(enUS.ui.localize.button.edit) })
        .click();
    const field = term.locator('h3 input');
    await expect(field).toBeVisible();
    await field.fill('parameter (revised)');
    await term
        .getByRole('button', { name: text(enUS.ui.localize.button.submit) })
        .first()
        .click();

    // The edit lands under the same path the Text tab writes, so the two
    // surfaces can't disagree about where a term's word lives.
    await page
        .getByRole('button', { name: text(enUS.ui.localize.toggle.mode.on) })
        .click();
    await page.getByRole('tab', { name: tabLabel(enUS, 4) }).click();
    await expect(
        page.getByText('glossary.parameter.word').first(),
    ).toBeVisible();
});

test('an edit made on the guide’s glossary reaches the submission bundle', async ({
    page,
}) => {
    // The guide renders the same GlossaryEntry, so making it editable there is
    // what keeps a translator from having to hunt for a term's path — and the
    // edit has to travel the same road as every other one, ending in a PR.
    await page.goto('/en-US/guide?section=glossary');

    await page
        .getByRole('button', { name: text(enUS.ui.localize.toggle.mode.off) })
        .click();

    // Scoped to a glossary entry: the localization panel above every page has
    // edit buttons of its own, and they come first in DOM order.
    const entry = page.locator('.entry').first();
    await expect(entry).toBeVisible({ timeout: 15000 });
    await entry
        .locator('h3')
        .getByRole('button', { name: text(enUS.ui.localize.button.edit) })
        .click();
    await entry.locator('h3 input').fill('abstraction (revised)');
    await entry
        .getByRole('button', { name: text(enUS.ui.localize.button.submit) })
        .first()
        .click();

    // The workspace is where every edit is reviewed and submitted, wherever it
    // was made, so this one is queued there under its own locale path.
    await page.goto('/en-US/localize');
    await page.getByRole('tab', { name: tabLabel(enUS, 4) }).click();
    await expect(page.locator('.bundle-key')).toHaveText(
        'glossary.abstraction.word',
    );
});
