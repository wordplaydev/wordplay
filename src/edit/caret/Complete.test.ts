import Caret from '@edit/caret/Caret';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

function insert(code: string, position: number, text: string): string {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, position, undefined, undefined);
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

    test('typing × after a ⬚ This reference does not wrap it in parentheses', () => {
        // Inside a translate, `⬚` parses as the atomic This reference, so it
        // should become `⬚ × _`, not `(⬚) × _`.
        expect(insert('5 → [] ↦ ⬚', 10, '×')).toBe('5 → [] ↦ ⬚ × _');
    });
});

describe('completeDelimiter only completes formatting symbols in markup words', () => {
    test('typing formatting symbols inside a text literal does not autocomplete', () => {
        // Formatting has no meaning in text literals, so no closing symbol is inserted.
        expect(insert("'hello'", 3, '/')).toBe("'he/llo'");
        expect(insert("'hello'", 3, '*')).toBe("'he*llo'");
        expect(insert("'hello'", 3, '_')).toBe("'he_llo'");
        expect(insert("'hello'", 3, '~')).toBe("'he~llo'");
        expect(insert("'hello'", 3, '^')).toBe("'he^llo'");
    });

    test('typing formatting symbols in markup words autocompletes', () => {
        expect(insert('¶hello¶1', 3, '/')).toBe('¶he//llo¶1');
        expect(insert('`hello`', 3, '/')).toBe('`he//llo`');
    });

    test('typing formatting symbols in a text literal nested in a doc example does not autocomplete', () => {
        // The nearest container of the words is the text literal, not the doc's markup.
        expect(insert("¶a \\'hello'\\ b¶1", 7, '/')).toBe("¶a \\'he/llo'\\ b¶1");
    });

    test('typing an elision symbol outside words is unchanged', () => {
        // A lone * outside words is treated as elision space, not completed; same as before this gate.
        expect(insert('', 0, '*')).toBe('*');
    });

    test('typing structural delimiters in code still autocompletes', () => {
        expect(insert('', 0, '(')).toBe('()');
    });
});

describe('completeBindOrKeyValue respects content on the same line', () => {
    test('typing : after a reference on an otherwise empty line autocompletes a placeholder', () => {
        expect(insert('x', 1, ':')).toBe('x: _');
    });

    test('typing : in front of an expression on the same line skips the placeholder', () => {
        // Source is `x5`; caret is after `x`. Typing `:` should not insert a
        // placeholder, because `5` already follows on the same line. The `:`
        // is inserted as plain text and the parser treats the result as a Bind.
        expect(insert('x5', 1, ':')).toBe('x:5');
    });

    test('typing : in front of an expression separated by spaces still skips the placeholder', () => {
        expect(insert('x 5', 1, ':')).toBe('x: 5');
    });

    test('typing : before a newline autocompletes a placeholder', () => {
        // Whitespace + newline counts as an empty line after the caret.
        expect(insert('x \n5', 1, ':')).toBe('x: _ \n5');
    });
});
