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

/** Type text at a position in text mode, returning the resulting code. */
function insert(code: string, position: number, text: string): string {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, position, undefined, undefined);
    const result = caret.insert(text, false, project, true);
    if (Array.isArray(result) && result[0] instanceof Source)
        return result[0].getCode().toString();
    return code;
}

/** Like {@link insert}, but also returns where the caret landed. */
function insertWithCaret(
    code: string,
    position: number,
    text: string,
): { code: string; position: CaretPosition | undefined } {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, position, undefined, undefined);
    const result = caret.insert(text, false, project, true);
    if (Array.isArray(result) && result[0] instanceof Source)
        return {
            code: result[0].getCode().toString(),
            position: result[1].position,
        };
    return { code, position: undefined };
}

/** Ask for a blocks-mode completion directly, bypassing the blocks conflict gate, so the
 *  template completions can be tested in isolation. Undefined means no completion fired. */
function completeInBlocks(
    code: string,
    position: number,
    text: string,
): string | undefined {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, position, undefined, undefined);
    const result = completeInsertion(project, caret, text, true);
    return result === undefined ? undefined : result[0].getCode().toString();
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

describe('text mode types exactly what was typed, except delimiter closes', () => {
    test('template completions never fire in text mode', () => {
        // Typing a syntactically correct sequence must produce exactly that program,
        // so no completion may insert placeholders or select nodes.
        expect(insert('1', 1, '+')).toBe('1+');
        expect(insert('', 0, '~')).toBe('~');
        expect(insert('', 0, '-')).toBe('-');
        expect(insert('⊤ &', 3, '~')).toBe('⊤ &~');
        expect(insert('Phrase(', 7, '~')).toBe('Phrase(~');
        expect(insert('x', 1, ':')).toBe('x:');
        expect(insert('x \n5', 1, ':')).toBe('x: \n5');
        expect(insert('1', 1, '→')).toBe('1→');
        expect(insert('x', 1, '•')).toBe('x•');
        expect(insert('5 → [] ↦ ⬚', 10, '×')).toBe('5 → [] ↦ ⬚×');
    });

    test('access templates never fire in text mode; brackets just auto-close', () => {
        expect(insert('[1 2 3]', 7, '[')).toBe('[1 2 3][]');
        expect(insert('{1 2 3}', 7, '{')).toBe('{1 2 3}{}');
    });

    test('markup templates never fire in text mode', () => {
        // No web link template; just the character. The code delimiter still auto-closes, since
        // its close is what the creator types at the end of the example.
        expect(insert('¶hi¶1', 3, '<')).toBe('¶hi<¶1');
        expect(insert('¶hi¶1', 3, '\\')).toBe('¶hi\\\\¶1');
    });

    test('( after a function reference auto-closes with the caret inside', () => {
        // No Evaluate template with placeholder inputs; the close would be typed
        // later anyway, and the caret stays a text position.
        const { code, position } = insertWithCaret('ƒ f(a•#) a\nf', 12, '(');
        expect(code).toBe('ƒ f(a•#) a\nf()');
        expect(position).toBe(13);
    });

    test('... still becomes a stream symbol in code, but never in words', () => {
        expect(insert('1 ..', 4, '.')).toBe('1 …');
        expect(insert("'wait..'", 7, '.')).toBe("'wait...'");
        expect(insert('¶hm..¶1', 5, '.')).toBe('¶hm...¶1');
    });

    test('dots escalate: a second makes a range, a third makes a stream', () => {
        // Typing the second dot of `1..10`.
        expect(insert('1.', 2, '.')).toBe('1‥');
        // Typing the third, which lands on the range the second one made.
        expect(insert('1‥', 2, '.')).toBe('1…');
        // A range between names, the same way.
        expect(insert('a.', 2, '.')).toBe('a‥');
        // The first dot is left alone, so a decimal and an access still work.
        expect(insert('1', 1, '.')).toBe('1.');
        expect(insert('x', 1, '.')).toBe('x.');
        // A decimal's dot isn't consecutive, so nothing escalates.
        expect(insert('1.5', 3, '.')).toBe('1.5.');
        // Prose is prose in both text and markup, at either rung.
        expect(insert("'wait.'", 6, '.')).toBe("'wait..'");
        expect(insert('¶hm.¶1', 4, '.')).toBe('¶hm..¶1');
    });
});

describe('completeOperatorEvaluate skips characters with non-operator meanings', () => {
    test('typing | after a Boolean does not autocomplete a BinaryEvaluate', () => {
        // `|` is the `or` operator on Bool but also separates types in a
        // UnionType. We prefer the literal character so the user can type a
        // union type or finish the expression themselves.
        expect(completeInBlocks('⊤', 1, '|')).toBeUndefined();
    });

    test('typing + after a Number still autocompletes a BinaryEvaluate', () => {
        // Sanity check: operators without non-operator meanings should still
        // autocomplete. `+` should expand `1` to `1 + _`.
        expect(completeInBlocks('1', 1, '+')).toBe('1 + _');
    });

    test('typing % after a non-percent NumberLiteral does not complete', () => {
        // `%` after a plain number should land as a percent suffix, not a
        // modulo BinaryEvaluate.
        expect(completeInBlocks('50', 2, '%')).toBeUndefined();
    });

    test('typing × after a ⬚ This reference does not wrap it in parentheses', () => {
        // Inside a translate, `⬚` parses as the atomic This reference, so it
        // should become `⬚ × _`, not `(⬚) × _`.
        expect(completeInBlocks('5 → [] ↦ ⬚', 10, '×')).toBe('5 → [] ↦ ⬚ × _');
    });
});

describe('completeOperatorEvaluate completes an operator as a unary evaluate where an expression is expected', () => {
    test('typing an operator on an empty program completes a placeholder operand', () => {
        expect(completeInBlocks('', 0, '~')).toBe('~_');
        expect(completeInBlocks('', 0, '-')).toBe('-_');
    });

    test('typing ~ after a binary operator keeps the operator binary', () => {
        // The space is what makes this a conjunction: `⊤ &~_` parses as two
        // statements, because `&` bound tightly to `~` is read as a prefix itself.
        expect(completeInBlocks('⊤ &', 3, '~')).toBe('⊤ & ~_');
        expect(completeInBlocks('⊤ & ', 4, '~')).toBe('⊤ & ~_');
        expect(completeInBlocks('1 +', 3, '-')).toBe('1 + -_');
    });

    test('typing an operator after an opening delimiter completes a placeholder operand', () => {
        // Nothing stands in for the missing expression in an empty inputs or values
        // list, so the opening delimiter is what marks this as a prefix position.
        expect(completeInBlocks('Phrase(', 7, '~')).toBe('Phrase(~_');
        expect(completeInBlocks('[', 1, '~')).toBe('[~_');
        expect(completeInBlocks('{', 1, '~')).toBe('{~_');
    });

    test('typing ~ in an empty bind value completes a placeholder operand', () => {
        expect(completeInBlocks('x: ', 3, '~')).toBe('x: ~_');
    });

    test('typing an operator in a reaction’s empty slots completes a placeholder operand', () => {
        expect(completeInBlocks('pick: ⊤…∆Button()…', 18, '~')).toBe(
            'pick: ⊤…∆Button()…~_',
        );
        // Not just `~`, and not only where the preceding stream happens to be a
        // Boolean: any operator in an empty slot can only be a prefix.
        expect(completeInBlocks('pick: 1…∆Time()…', 16, '-')).toBe(
            'pick: 1…∆Time()…-_',
        );
        expect(completeInBlocks('pick: ⊤…∆', 9, '~')).toBe('pick: ⊤…∆~_');
    });

    test('typing | where an expression is expected does not complete', () => {
        // `|` also separates types in a UnionType, so it is typed literally in
        // either form of evaluation.
        expect(completeInBlocks('pick: ⊤…∆Button()…', 18, '|')).toBeUndefined();
    });

    test('typing ~ after a complete expression does not complete', () => {
        // A prefix operator cannot take the expression to its left, and `⊤ ~_` would
        // be two statements rather than a negation of anything.
        expect(completeInBlocks('⊤', 1, '~')).toBeUndefined();
        expect(completeInBlocks('1 + _', 5, '×')).toBeUndefined();
    });

    test('typing + or - after whitespace does not complete', () => {
        // They may be starting a negative number literal, which the tokenizer signs.
        expect(completeInBlocks('1 ', 2, '-')).toBeUndefined();
        expect(completeInBlocks('1 + ', 4, '-')).toBeUndefined();
    });

    test('typing an operator inside a token does not complete', () => {
        // There is no expression slot inside a text literal or a name.
        expect(completeInBlocks("'hello'", 3, '~')).toBeUndefined();
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
        expect(completeInBlocks('x', 1, ':')).toBe('x: _');
    });

    test('typing : in front of an expression on the same line skips the placeholder', () => {
        // Source is `x5`; caret is after `x`. Typing `:` should not insert a
        // placeholder, because `5` already follows on the same line. The `:`
        // is inserted as plain text and the parser treats the result as a Bind.
        expect(completeInBlocks('x5', 1, ':')).toBeUndefined();
        expect(insert('x5', 1, ':')).toBe('x:5');
    });

    test('typing : in front of an expression separated by spaces still skips the placeholder', () => {
        expect(completeInBlocks('x 5', 1, ':')).toBeUndefined();
        expect(insert('x 5', 1, ':')).toBe('x: 5');
    });

    test('typing : before a newline autocompletes a placeholder', () => {
        // Whitespace + newline counts as an empty line after the caret.
        expect(completeInBlocks('x \n5', 1, ':')).toBe('x: _ \n5');
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
        const result = completeInsertion(project, caret, ':', true);
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

describe('access completions only fire on their own delimiter, in blocks mode', () => {
    test('[ after a list still completes a list access', () => {
        // The index placeholder is typed, since a list index is always a number.
        expect(completeInBlocks('[1 2 3]', 7, '[')).toBe('[1 2 3][_•#]');
    });

    test('{ after a list completes a set, not a list access', () => {
        // ListAccess builds its own brackets, so without a delimiter check every
        // auto-closing character after a list became `[_]`.
        expect(completeInBlocks('[1 2 3]', 7, '{')).toBe('[1 2 3]{}');
    });

    test('a quote after a list completes a text literal', () => {
        expect(completeInBlocks('[1 2 3]', 7, "'")).toBe("[1 2 3]''");
    });

    test('{ after a set still completes a set access', () => {
        expect(completeInBlocks('{1 2 3}', 7, '{')).toBe('{1 2 3}{_}');
    });

    test('[ after a set completes a list, not a set access', () => {
        expect(completeInBlocks('{1 2 3}', 7, '[')).toBe('{1 2 3}[]');
    });
});

describe('a completion never parses worse than the plain insertion', () => {
    test('auto-closed empty pairs introduce no unparsable nodes', () => {
        // Each of these results must parse; the guard in completeInsertion
        // would otherwise discard the completion in favor of the raw character.
        expect(insert('', 0, '(')).toBe('()');
        expect(insert('', 0, '[')).toBe('[]');
        expect(insert('', 0, '{')).toBe('{}');
        expect(insert('', 0, "'")).toBe("''");
        expect(insert('', 0, '“')).toBe('“”');
        expect(insert('', 0, '⎡')).toBe('⎡⎦');
        expect(insert('', 0, '¶')).toBe('¶¶');
        expect(insert('', 0, '⣿')).toBe('⣿⣿');
    });
});
