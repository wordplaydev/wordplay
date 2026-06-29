import { expect, test } from 'vitest';
import scanLiteralGlossaryTerms from './glossaryScan';

const glossary = [
    { id: 'value', word: 'value' },
    { id: 'list', word: 'list' },
];

test('finds a literal glossary term and suggests the symbolic reference', () => {
    const found = scanLiteralGlossaryTerms('the value is here', glossary);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
        id: 'value',
        suggestion: 'the @value is here',
    });
});

test('skips a term already written as an @reference', () => {
    expect(scanLiteralGlossaryTerms('the @value is here', glossary)).toEqual(
        [],
    );
});

test('skips a term inside an @Concept reference', () => {
    expect(scanLiteralGlossaryTerms('see @List for items', glossary)).toEqual(
        [],
    );
});

test('skips a term inside a \\code\\ block', () => {
    expect(scanLiteralGlossaryTerms('run \\value\\ now', glossary)).toEqual([]);
});

test('matches whole words only', () => {
    // "values" should not match the term "value".
    expect(scanLiteralGlossaryTerms('many values exist', glossary)).toEqual([]);
});

test('matches case-insensitively at a sentence start', () => {
    const found = scanLiteralGlossaryTerms('Value matters', glossary);
    expect(found).toHaveLength(1);
    expect(found[0].suggestion).toBe('@value matters');
});
