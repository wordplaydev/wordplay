import { getPluralBranches } from '@locale/templateInputs';
import { expect, test } from 'vitest';

test('a plural branch reports its arm count', () => {
    expect(
        getPluralBranches('list of $#count[$count value|$count values]'),
    ).toEqual([{ name: 'count', arms: 2 }]);
    expect(getPluralBranches('$#count[a|b|c|d|e|f]')).toEqual([
        { name: 'count', arms: 6 },
    ]);
    // Japanese: one form, so no separators at all.
    expect(getPluralBranches('$#count[個]')).toEqual([
        { name: 'count', arms: 1 },
    ]);
});

test('an unmarked branch is not a plural branch', () => {
    expect(getPluralBranches('$name[$name|nobody]')).toEqual([]);
    expect(getPluralBranches('plain words')).toEqual([]);
});

test('a nested branch does not inflate the arm count', () => {
    // The inner `|` belongs to the nested branch, not to the plural arms.
    expect(
        getPluralBranches(
            '$#count[one $name[of $name|]|many $name[of $name|]]',
        ),
    ).toEqual([{ name: 'count', arms: 2 }]);
});

test('escaped delimiters are literal characters, not structure', () => {
    // Doubling escapes, matching the tokenizer.
    expect(getPluralBranches('$#count[a || b|c]')).toEqual([
        { name: 'count', arms: 2 },
    ]);
});

test('several plural branches in one template are each counted', () => {
    expect(
        getPluralBranches('$#hits[hit|hits] in $#files[file|files]'),
    ).toEqual([
        { name: 'hits', arms: 2 },
        { name: 'files', arms: 2 },
    ]);
});
