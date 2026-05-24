import Caret from '@edit/caret/Caret';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

function insert(code: string, position: number, text: string): string {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, position, undefined, undefined, undefined);
    const result = caret.insert(text, false, project, true);
    if (Array.isArray(result) && result[0] instanceof Source)
        return result[0].getCode().toString();
    return code;
}

describe('completeBinaryEvaluate skips characters with non-operator meanings', () => {
    test('typing | after a Boolean does not autocomplete a BinaryEvaluate', () => {
        // `|` is the `or` operator on Bool but also separates types in a
        // UnionType. We prefer the literal character so the user can type a
        // union type or finish the expression themselves.
        expect(insert('⊤', 1, '|')).toBe('⊤|');
    });

    test('typing + after a Number still autocompletes a BinaryEvaluate', () => {
        // Sanity check: operators without non-operator meanings should still
        // autocomplete. `+` should expand `1` to `1 + _`.
        expect(insert('1', 1, '+')).toBe('1 + _');
    });

    test('typing % after a non-percent NumberLiteral lands as a percent suffix', () => {
        // Existing behavior: `%` after a plain number becomes a percent
        // literal, not a modulo BinaryEvaluate.
        expect(insert('50', 2, '%')).toBe('50%');
    });
});
