import { describe, expect, test } from 'vitest';
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
    // "values" should not match the term "value", which declares no forms here.
    expect(scanLiteralGlossaryTerms('many values exist', glossary)).toEqual([]);
});

describe('other written forms', () => {
    const inflected = [
        { id: 'value', word: 'value', forms: ['values'] },
        { id: 'sideEffect', word: 'side effect', forms: ['side effects'] },
    ];

    test('an inflected occurrence suggests a reference written with that form', () => {
        const found = scanLiteralGlossaryTerms('many values exist', inflected);
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({
            id: 'value',
            term: 'values',
            suggestion: 'many @values exist',
        });
    });

    test('a sentence-initial form keeps its capital', () => {
        expect(
            scanLiteralGlossaryTerms('Values matter', inflected)[0].suggestion,
        ).toBe('@Values matter');
    });

    test('the longest form wins, so a plural beats the singular inside it', () => {
        // Matching "value" first would leave a stray "s" behind.
        expect(
            scanLiteralGlossaryTerms('the values here', inflected)[0].term,
        ).toBe('values');
    });

    test('a form no reference can express offers no fix', () => {
        // `@side effects` would be broken markup, and `@sideEffect` would
        // silently make the prose singular, so neither is suggested.
        expect(
            scanLiteralGlossaryTerms('two side effects appear', inflected),
        ).toEqual([]);
    });
});

test('matches case-insensitively at a sentence start', () => {
    const found = scanLiteralGlossaryTerms('Value matters', glossary);
    expect(found).toHaveLength(1);
    expect(found[0].suggestion).toBe('@value matters');
});

test('a subconcept reference is protected, separator and all', () => {
    // `CONCEPT_RE` used to match only a reference's head, so the `name` in
    // `@Phrase.name` looked like bare prose and a suggestion rewrote it to
    // `@Phrase.@name`, breaking the reference it was sitting inside.
    const names = [{ id: 'name', word: 'name', forms: ['names'] }];
    expect(
        scanLiteralGlossaryTerms('every @Phrase.name is unique', names),
    ).toEqual([]);
    // A language tag was already protected; keep it that way.
    expect(scanLiteralGlossaryTerms('read @Phrase/en aloud', names)).toEqual(
        [],
    );
    // A bare occurrence beside one is still found.
    expect(
        scanLiteralGlossaryTerms('@Phrase.name gives it a name', names)[0]
            .suggestion,
    ).toBe('@Phrase.name gives it a @name');
});

test('a web link is protected, label and url alike', () => {
    // `<2-letter code@https://…>` became `<2-letter @code@https://…>`, which no
    // longer parses as a link: the `@` in a web link is a separator, not a
    // reference, so a term in the label must be left alone.
    const codes = [{ id: 'code', word: 'code', forms: ['codes'] }];
    expect(
        scanLiteralGlossaryTerms(
            'its <2-letter code@https://x.dev/codes>',
            codes,
        ),
    ).toEqual([]);
    // Ordinary angle-bracketed prose is not a link and stays scannable.
    expect(
        scanLiteralGlossaryTerms('compare <a> and code here', codes)[0]
            .suggestion,
    ).toBe('compare <a> and @code here');
});

test('a word carrying a combining mark is not a match', () => {
    // The Arabic for "region" written with a hamza the glossary's own spelling
    // lacks: matching it left the mark behind as `@regionٔ`, a reference
    // that resolves to nothing.
    const regions = [{ id: 'region', word: 'منطقة' }];
    expect(scanLiteralGlossaryTerms('اسم منطقةٔ زمنية', regions)).toEqual([]);
    // The bare word still matches.
    expect(
        scanLiteralGlossaryTerms('اسم منطقة زمنية', regions)[0].suggestion,
    ).toBe('اسم @region زمنية');
});
