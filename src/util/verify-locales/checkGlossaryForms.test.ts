import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import checkGlossaryForms from '@util/verify-locales/checkGlossaryForms';
import { collectingLog } from '@util/verify-locales/Log';
import { expect, test } from 'vitest';

/** en-US with the `parameter` term's forms replaced. */
function localeWithForms(forms: string[]): LocaleText {
    const copy = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    copy.glossary.parameter.forms = forms;
    return copy;
}

function check(forms: string[], fix = false) {
    const log = collectingLog().log;
    const revised = checkGlossaryForms(log, localeWithForms(forms), fix);
    return { errors: log.errorCount, forms: revised.glossary.parameter.forms };
}

test('en-US passes, so the forms it ships are all live and unambiguous', () => {
    const log = collectingLog().log;
    checkGlossaryForms(log, DefaultLocale, false);
    expect(log.errorCount).toBe(0);
});

test('a plural form passes', () => {
    expect(check(['parameters']).errors).toBe(0);
});

test('an empty form fails, and fix drops it', () => {
    expect(check(['parameters', '  ']).errors).toBeGreaterThan(0);
    expect(check(['parameters', '  '], true).forms).toEqual(['parameters']);
});

test('a form with a write-status annotation fails, and fix strips it', () => {
    expect(check(['$~parameters']).errors).toBeGreaterThan(0);
    expect(check(['$~parameters'], true).forms).toEqual(['parameters']);
});

test('fix removes the key entirely when nothing is left', () => {
    expect(check(['', ' '], true).forms).toBeUndefined();
});

test('the term’s own word or id fails, since it already resolves', () => {
    expect(check(['parameter']).errors).toBeGreaterThan(0);
});

test('another term’s word or id fails as ambiguous', () => {
    expect(check(['value']).errors).toBeGreaterThan(0);
    expect(check(['sideEffect']).errors).toBeGreaterThan(0);
});

test('a documented concept’s name fails, since the concept wins', () => {
    // A reference to `@Phrase` resolves to the output concept, so a form
    // spelled that way could never match.
    expect(check(['Phrase']).errors).toBeGreaterThan(0);
    expect(check(['names']).errors).toBeGreaterThan(0);
});

test('a reserved namespace fails', () => {
    for (const name of ['ui', 'how', 'u'])
        expect(check([name]).errors).toBeGreaterThan(0);
});

test('a duplicate form fails', () => {
    expect(check(['parameters', 'Parameters']).errors).toBeGreaterThan(0);
});

test('an unreferenceable form warns but does not fail', () => {
    // A space or hyphen ends a reference, so such a form only helps search —
    // worth keeping, hence a warning at most.
    expect(check(['parameter lists']).errors).toBe(0);
    // Something a reference can't contain at all warns rather than erring.
    expect(check(['parameters!']).errors).toBe(0);
});
