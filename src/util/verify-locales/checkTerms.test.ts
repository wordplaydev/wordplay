import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { getAllDeclaredInputNames } from '@locale/templateInputs';
import checkTerms from '@util/verify-locales/checkTerms';
import Log from '@util/verify-locales/Log';
import { expect, test } from 'vitest';

function localeWithTerms(terms: Record<string, string>): LocaleText {
    const copy = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    copy.terms = terms;
    return copy;
}

function errorsFor(terms: Record<string, string>): number {
    const log = new Log(false);
    checkTerms(log, localeWithTerms(terms));
    return log.errorCount;
}

test('a valid, disjoint word list passes', () => {
    expect(errorsFor({ program: 'project', how: 'how-to' })).toBe(0);
});

test('Unicode-letter keys pass; a Unicode-digit-led key fails', () => {
    expect(errorsFor({ café: 'Kaffee', 名前: 'name' })).toBe(0);
    // Bengali digit start — not a leading letter.
    expect(errorsFor({ '১key': 'x' })).toBeGreaterThan(0);
});

test('an empty word list passes', () => {
    expect(errorsFor({})).toBe(0);
});

test('a key that is not a valid identifier fails', () => {
    // Must start with a letter and be alphanumeric.
    expect(errorsFor({ '1st': 'first' })).toBeGreaterThan(0);
    expect(errorsFor({ 'has space': 'x' })).toBeGreaterThan(0);
    expect(errorsFor({ '123': 'x' })).toBeGreaterThan(0);
});

test('a key that collides with a template input name fails', () => {
    // Pick a real declared input name; a $name reference to it would be ambiguous.
    const anInputName = [...getAllDeclaredInputNames()][0];
    expect(anInputName).toBeDefined();
    expect(errorsFor({ [anInputName]: 'whatever' })).toBeGreaterThan(0);
});

test('a phrase that references another term fails', () => {
    // Terms can't be defined in terms of other terms (keeps substitution a
    // single, order-independent pass).
    expect(errorsFor({ a: 'the $b thing', b: 'other' })).toBeGreaterThan(0);
});

test('a phrase with an escaped $$ is allowed', () => {
    expect(errorsFor({ price: 'costs $$5' })).toBe(0);
});
