import DefaultLocale from '@locale/DefaultLocale';
import { getConventionsForPrompt } from '@locale/getConventionsForPrompt';
import { expect, test } from 'vitest';

test('with no target, contributes nothing', () => {
    expect(getConventionsForPrompt(undefined)).toBe('');
});

/** The prompt is cached per source/target/glossary, so a locale that declares
 *  no conventions must get a byte-identical prompt to before this section
 *  existed — an empty section that still emitted a header would break that. */
test('a locale with neither guidance nor terms contributes nothing', () => {
    expect(
        getConventionsForPrompt({ ...DefaultLocale, guidance: '', terms: {} }),
    ).toBe('');
});

test("includes the locale's guidance", () => {
    const out = getConventionsForPrompt({
        ...DefaultLocale,
        guidance: 'Address the learner as tú, never usted.',
        terms: {},
    });
    expect(out).toContain('Address the learner as tú, never usted.');
});

test('strips annotation markers from guidance', () => {
    const out = getConventionsForPrompt({
        ...DefaultLocale,
        guidance: '$~Usa el español de México.',
        terms: {},
    });
    expect(out).toContain('Usa el español de México.');
    expect(out).not.toContain('$~');
});

test('lists each term with the phrase it renders as', () => {
    const out = getConventionsForPrompt({
        ...DefaultLocale,
        guidance: '',
        terms: { stage: 'escenario' },
    });
    expect(out).toContain('$stage');
    expect(out).toContain('escenario');
});

test('skips a term whose phrase is empty', () => {
    const out = getConventionsForPrompt({
        ...DefaultLocale,
        guidance: '',
        terms: { stage: '' },
    });
    expect(out).toBe('');
});

test('includes both sections when a locale declares both', () => {
    const out = getConventionsForPrompt({
        ...DefaultLocale,
        guidance: 'Use Mexican Spanish.',
        terms: { stage: 'escenario' },
    });
    expect(out).toContain('Use Mexican Spanish.');
    expect(out).toContain('$stage');
});

/** The one locale this was written for: its guidance must actually reach the
 *  prompt, including the product-term list the file itself has contradicted. */
test('the real es-MX guidance reaches the prompt', async () => {
    const esMX = (
        await import('../../static/locales/es-MX/es-MX.json', {
            with: { type: 'json' },
        })
    ).default;
    const out = getConventionsForPrompt({
        ...DefaultLocale,
        guidance: esMX.guidance,
        terms: {},
    });
    expect(out).toContain('flujo');
    expect(out).not.toContain('$~');
});
