import { groupByCause } from '#conflicts/causes.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import { tokenize } from '#parser/Tokenizer.ts';
import { expect, test } from 'vitest';

/** The kinds of the program's statements, and the kinds of conflict it has, by cause. */
function read(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    return {
        // A program's text is written back from its tree, so losing any of it is losing the creator's work.
        text: source.getCode().toString(),
        statements: source.expression.expression.statements.map(
            (statement) => statement.constructor.name,
        ),
        conflicts: groupByCause(project.getConflicts() ?? [], (node) =>
            source.has(node),
        ).map((cause) => cause.conflict.constructor.name),
    };
}

const Whole = `¶Says hello.¶
name: 'kitty'
Phrase(\`hello *there* \\name\\\`)
Phrase('hi \\name\\!')`;

test('a program with every delimiter is read as it always was', () => {
    const plain = tokenize(Whole);
    const recovering = tokenize(Whole, undefined, true);
    expect(plain.getLexical().damaged).toBe(false);
    expect(recovering.getTokens().map((token) => token.getText())).toEqual(
        plain.getTokens().map((token) => token.getText()),
    );
    expect(read(Whole).conflicts).toEqual([]);
});

test.each([
    [
        'documentation that is never closed ends with its line',
        "¶Says hello.\nname: 'kitty'\n¶Shows it.¶\nPhrase(name)",
        ['Bind', 'DocumentedExpression'],
        ['UnclosedDelimiter'],
    ],
    [
        'documentation that is never opened begins with its line',
        "Says hello.¶\nname: 'kitty'\n¶Shows it.¶\nPhrase(name)",
        ['Bind', 'DocumentedExpression'],
        ['UnopenedDelimiter'],
    ],
    [
        'text that is never closed ends before the text after it',
        "name: 'kitty'\nPhrase('hello)\n['hi 'you' name]",
        ['Bind', 'Evaluate', 'ListLiteral'],
        ['UnclosedDelimiter', 'UnclosedDelimiter'],
    ],
    [
        'text that is never opened begins after what it was given to',
        "name: 'kitty'\nPhrase(hello there')\nPhrase(name)",
        ['Bind', 'Evaluate', 'Evaluate'],
        ['UnopenedDelimiter'],
    ],
    [
        'text broken across two lines is two halves of one text',
        "name: 'kitty'\n['hello\nthere, you']\nPhrase(name)",
        ['Bind', 'ListLiteral', 'Evaluate'],
        ['UnclosedDelimiter', 'UnopenedDelimiter'],
    ],
    [
        'formatted text that is never closed ends before the closes that end its line',
        "name: 'kitty'\nPhrase(`hello *there*)\nPhrase(`again`)\nPhrase(name)",
        ['Bind', 'Evaluate', 'Evaluate', 'Evaluate'],
        ['UnclosedDelimiter'],
    ],
    [
        'an interpolation that is never closed ends with its text',
        "name: 'kitty'\nPhrase('hello \\name')\nPhrase('again')",
        ['Bind', 'Evaluate', 'Evaluate'],
        ['UnclosedDelimiter'],
    ],
])('%s', (_, code, statements, conflicts) => {
    const result = read(code);
    expect(result.text).toBe(code);
    expect(result.statements).toEqual(statements);
    expect(result.conflicts).toEqual(conflicts);
});

test('a `\\` that no example owns does not end the program', () => {
    // What can't be parsed here stops at the `\`, and the `\` used to be left unread, and
    // everything after it with it.
    const code =
        "Stage([\n\tPhrase,(`a \\name\\ here`)\n\tPhrase('b')\n])\nname: 'kitty'";
    expect(read(code).text).toBe(code);
});

const Definitions = `•Pick(words•'' goto•'')
(
	ƒ both() words + goto
)
ƒ twice(pick•Pick times•#) pick.both() · times
twice(Pick('a' 'b') 2)`;

test.each([
    [
        'a structure whose ( was deleted',
        "•Pick(words•''",
        "•Pickwords•''",
        'UnopenedDelimiter',
    ],
    [
        'a function whose ( was deleted',
        'ƒ twice(pick•Pick',
        'ƒ twicepick•Pick',
        'UnopenedDelimiter',
    ],
    [
        'a quote too many after a (',
        "•Pick(words•''",
        "•Pick('words•''",
        'StrayDelimiter',
    ],
    [
        'a quote too many between inputs',
        "words•'' goto",
        "words•'' 'goto",
        'StrayDelimiter',
    ],
    [
        'a quote too many after a type',
        "words•'' goto",
        "words•''' goto",
        'StrayDelimiter',
    ],
    [
        'a quote too few in a type',
        "words•'' goto",
        "words•' goto",
        'StrayDelimiter',
    ],
])(
    '%s is one conflict, and the definition is still one',
    (_, from, to, conflict) => {
        expect(read(Definitions).conflicts).toEqual([]);
        const code = Definitions.replace(from, to);
        expect(code).not.toBe(Definitions);
        const result = read(code);
        expect(result.text).toBe(code);
        expect(result.statements).toEqual([
            'StructureDefinition',
            'FunctionDefinition',
            'Evaluate',
        ]);
        expect(result.conflicts).toEqual([conflict]);
    },
);

test('a line with every quote it should have is never repaired', () => {
    // Text that ends in a space closes where an opening would be written, and text
    // that is one space is nothing else. Neither is a sign of anything missing, even
    // while something is missing on another line.
    const code = "a: 'hello '\nb: ' '\nc: 'oops\n[a b c]";
    const result = read(code);
    expect(result.text).toBe(code);
    expect(result.statements).toEqual(['Bind', 'Bind', 'Bind', 'ListLiteral']);
    expect(result.conflicts).toEqual(['UnclosedDelimiter']);
});
