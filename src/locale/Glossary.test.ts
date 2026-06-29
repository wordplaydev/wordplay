import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import { getGlossaryForPrompt } from '@locale/Glossary';

test('with no target, lists the en-US word only (no mapping)', () => {
    const out = getGlossaryForPrompt(undefined);
    // The `value` term shows as the plain en-only form.
    expect(out).toContain('- value:');
    expect(out).not.toContain('- "value" ->');
});

test('maps each en-US term to its target-language word', () => {
    const target = {
        ...DefaultLocale,
        glossary: {
            ...DefaultLocale.glossary,
            value: { ...DefaultLocale.glossary.value, word: 'valor' },
        },
    };
    expect(getGlossaryForPrompt(target)).toContain('- "value" -> "valor":');
});

test('strips annotation markers from the target word', () => {
    const target = {
        ...DefaultLocale,
        glossary: {
            ...DefaultLocale.glossary,
            value: { ...DefaultLocale.glossary.value, word: '$~valor' },
        },
    };
    expect(getGlossaryForPrompt(target)).toContain('- "value" -> "valor":');
});

test('falls back to the en-only form when the target word equals en or is empty', () => {
    const target = {
        ...DefaultLocale,
        glossary: {
            ...DefaultLocale.glossary,
            value: { ...DefaultLocale.glossary.value, word: '$?' },
        },
    };
    const out = getGlossaryForPrompt(target);
    expect(out).toContain('- value:');
    expect(out).not.toContain('- "value" ->');
});
