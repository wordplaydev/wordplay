import Caret, { type CaretPosition } from '@edit/caret/Caret';
import { completeInsertion } from '@edit/caret/Complete';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Input from '@nodes/Input';
import type Node from '@nodes/Node';
import Reference from '@nodes/Reference';
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

/** Like {@link insert}, but with a node selected rather than a text position, which is
 *  what routes typing through Caret.wrap(). Returns the code and where the caret landed. */
function insertOnNode(
    code: string,
    find: (source: Source) => Node | undefined,
    text: string,
    blocks = false,
): { code: string; position: CaretPosition | undefined } {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const node = find(source);
    if (node === undefined) throw new Error(`No node found in ${code}`);
    const caret = new Caret(source, node, undefined, undefined);
    const result = caret.insert(text, blocks, project, true);
    if (Array.isArray(result) && result[0] instanceof Source)
        return {
            code: result[0].getCode().toString(),
            position: result[1].position,
        };
    return { code, position: undefined };
}

const firstPlaceholder = (source: Source) =>
    source.nodes().find((n) => n instanceof ExpressionPlaceholder);
const firstReference = (source: Source) =>
    source.nodes().find((n) => n instanceof Reference);

describe('completeOperatorEvaluate skips characters with non-operator meanings', () => {
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

describe('completeOperatorEvaluate completes an operator as a unary evaluate where an expression is expected', () => {
    test('typing an operator on an empty program completes a placeholder operand', () => {
        expect(insert('', 0, '~')).toBe('~_');
        expect(insert('', 0, '-')).toBe('-_');
    });

    test('typing ~ after a binary operator keeps the operator binary', () => {
        // The space is what makes this a conjunction: `⊤ &~_` parses as two
        // statements, because `&` bound tightly to `~` is read as a prefix itself.
        expect(insert('⊤ &', 3, '~')).toBe('⊤ & ~_');
        expect(insert('⊤ & ', 4, '~')).toBe('⊤ & ~_');
        expect(insert('1 +', 3, '-')).toBe('1 + -_');
    });

    test('typing an operator after an opening delimiter completes a placeholder operand', () => {
        // Nothing stands in for the missing expression in an empty inputs or values
        // list, so the opening delimiter is what marks this as a prefix position.
        expect(insert('Phrase(', 7, '~')).toBe('Phrase(~_');
        expect(insert('[', 1, '~')).toBe('[~_');
        expect(insert('{', 1, '~')).toBe('{~_');
    });

    test('typing ~ in an empty bind value completes a placeholder operand', () => {
        expect(insert('x: ', 3, '~')).toBe('x: ~_');
    });

    test('typing an operator in a reaction’s empty slots completes a placeholder operand', () => {
        expect(insert('pick: ⊤…∆Button()…', 18, '~')).toBe(
            'pick: ⊤…∆Button()…~_',
        );
        // Not just `~`, and not only where the preceding stream happens to be a
        // Boolean: any operator in an empty slot can only be a prefix.
        expect(insert('pick: 1…∆Time()…', 16, '-')).toBe('pick: 1…∆Time()…-_');
        expect(insert('pick: ⊤…∆', 9, '~')).toBe('pick: ⊤…∆~_');
    });

    test('typing | where an expression is expected lands as a literal character', () => {
        // `|` also separates types in a UnionType, so it is typed literally in
        // either form of evaluation.
        expect(insert('pick: ⊤…∆Button()…', 18, '|')).toBe(
            'pick: ⊤…∆Button()…|',
        );
    });

    test('typing ~ after a complete expression lands as a literal character', () => {
        // A prefix operator cannot take the expression to its left, and `⊤ ~_` would
        // be two statements rather than a negation of anything.
        expect(insert('⊤', 1, '~')).toBe('⊤~');
        expect(insert('1 + _', 5, '×')).toBe('1 + _×');
    });

    test('typing + or - after whitespace lands as a literal character', () => {
        // They may be starting a negative number literal, which the tokenizer signs.
        expect(insert('1 ', 2, '-')).toBe('1 -');
        expect(insert('1 + ', 4, '-')).toBe('1 + -');
    });

    test('typing an operator inside a token lands as a literal character', () => {
        // There is no expression slot inside a text literal or a name.
        expect(insert("'hello'", 3, '~')).toBe("'he~llo'");
        expect(insert('abc', 2, '~')).toBe('ab~c');
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
        expect(insert("¶a \\'hello'\\ b¶1", 7, '/')).toBe(
            "¶a \\'he/llo'\\ b¶1",
        );
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

    test('typing : after a name in an Evaluate completes an Input, not a Bind', () => {
        // A Bind in an Evaluate's inputs is treated as a positional expression
        // by the input mapping, so it would be mapped (and its placeholder
        // labeled) as whatever unset input its position reaches (e.g. `style`),
        // not the input it names. Regression for the `changing:` mislabeling.
        const code = "Phrase('hi' changing\n)";
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const position = code.indexOf('changing') + 'changing'.length;
        const caret = new Caret(source, position, undefined, undefined);
        const result = completeInsertion(project, caret, ':', false);
        expect(result).toBeDefined();
        if (result === undefined) return;
        const [newSource] = result;
        const placeholder = newSource
            .nodes()
            .find((n) => n instanceof ExpressionPlaceholder);
        expect(placeholder).toBeDefined();
        const parent = placeholder
            ? newSource.root.getParent(placeholder)
            : undefined;
        expect(parent).toBeInstanceOf(Input);
        expect(parent instanceof Input && parent.getName()).toBe('changing');
    });
});

describe('typing a delimiter on a selected node leaves the caret inside it', () => {
    test('[ on a selected placeholder makes an empty list with the caret between the brackets', () => {
        // Selecting the whole list would mean the next character typed replaces
        // it, so the caret goes where the first value belongs. The placeholder
        // is skipped entirely, since an empty list is legitimate.
        const { code, position } = insertOnNode('_', firstPlaceholder, '[');
        expect(code).toBe('[]');
        expect(position).toBe(1);
    });

    test('{ on a selected placeholder makes an empty set with the caret between the braces', () => {
        const { code, position } = insertOnNode('_', firstPlaceholder, '{');
        expect(code).toBe('{}');
        expect(position).toBe(1);
    });

    test('( on a selected placeholder keeps the placeholder and selects it', () => {
        // An empty block is an ExpectedEndingExpression conflict, so the
        // placeholder stays — but selected, so typing overwrites it.
        const { code, position } = insertOnNode('_', firstPlaceholder, '(');
        expect(code).toBe('(_)');
        expect(position).toBeInstanceOf(ExpressionPlaceholder);
    });

    test('[ on a selected expression wraps it with the caret before the close', () => {
        // Ready for the next entry, rather than selecting what was just made.
        const { code, position } = insertOnNode('x', firstReference, '[');
        expect(code).toBe('[x]');
        expect(position).toBe(2);
    });

    test('blocks mode keeps the placeholder, since it has no text positions', () => {
        const { code, position } = insertOnNode(
            '_',
            firstPlaceholder,
            '[',
            true,
        );
        expect(code).toBe('[_]');
        expect(position).toBeInstanceOf(ExpressionPlaceholder);
    });
});

describe('access completions only fire on their own delimiter', () => {
    test('[ after a list still completes a list access', () => {
        // The index placeholder is typed, since a list index is always a number.
        expect(insert('[1 2 3]', 7, '[')).toBe('[1 2 3][_•#]');
    });

    test('{ after a list completes a set, not a list access', () => {
        // ListAccess builds its own brackets, so without a delimiter check every
        // auto-closing character after a list became `[_]`.
        expect(insert('[1 2 3]', 7, '{')).toBe('[1 2 3]{}');
    });

    test('a quote after a list completes a text literal', () => {
        expect(insert('[1 2 3]', 7, "'")).toBe("[1 2 3]''");
    });

    test('{ after a set still completes a set access', () => {
        expect(insert('{1 2 3}', 7, '{')).toBe('{1 2 3}{_}');
    });

    test('[ after a set completes a list, not a set access', () => {
        expect(insert('{1 2 3}', 7, '[')).toBe('{1 2 3}[]');
    });
});
