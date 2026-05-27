import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import DefaultLocales from '@locale/DefaultLocales';
import Bind from '@nodes/Bind';
import BooleanLiteral from '@nodes/BooleanLiteral';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import StreamType from '@nodes/StreamType';
import Unit from '@nodes/Unit';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { TRUE_SYMBOL } from '@parser/Symbols';
import StructureDefinition from '@nodes/StructureDefinition';
import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import NumberLiteral from '@nodes/NumberLiteral';
import Append from '@edit/revision/Append';
import Assign from '@edit/revision/Assign';
import Replace from '@edit/revision/Replace';
import type Revision from '@edit/revision/Revision';
import { getEditsAt } from '@edit/menu/PossibleEdits';
import Language from '@nodes/Language';
import Token from '@nodes/Token';
import { Sym } from '@nodes/Sym';
import Dimension from '@nodes/Dimension';
import Reference from '@nodes/Reference';

test.each([
    ['blank programs suggest numbers', '**', undefined, Append, '0'],
    ['blank programs suggest booleans', '**', undefined, Append, TRUE_SYMBOL],
    ['blank programs suggest text', '**', undefined, Append, "''"],
    ['blank programs suggest lists', '**', undefined, Append, '[]'],
    ['blank programs suggest sets', '**', undefined, Append, '{}'],
    ['blank programs suggest maps', '**', undefined, Append, '[]'],
    ['blank programs suggest tables', '**', undefined, Append, '[]'],
    ['set unset bind value', 'a:**', undefined, Assign, '0'],
    ['suggest binary evaluate completions', '1 + **', undefined, Assign, '1'],
    [
        'suggest conditional on boolean value',
        'b: ⊥',
        (node: Node) => node instanceof BooleanLiteral,
        Replace,
        '⊥ ? ⊤ ⊥',
    ],
    ['suggest phrase on empty program', '**', undefined, Append, "💬('')"],
    [
        'complete phrase on empty program',
        'Ph**',
        undefined,
        Replace,
        "Phrase('')",
    ],
    [
        'suggest matching evaluates',
        'Group(Row() [**])',
        undefined,
        Append,
        "💬('')",
    ],
    [
        'suggest evaluate on function',
        `ƒ sum(a•? b•?) a & b\ns**`,
        undefined,
        Replace,
        'sum(⊤ ⊤)',
    ],
    [
        'suggest evaluate wrap',
        `ƒ sum(a•? b•?) a & b\nsum()`,
        (node) => node instanceof Evaluate,
        Replace,
        '(sum())',
    ],
    ['suggest basis function eval', `"hi".**`, undefined, Replace, '"hi".📏()'],
    [
        'suggest binary evaluate',
        `1**`,
        (node) => node instanceof NumberLiteral,
        Replace,
        '1 ÷ _•#',
    ],
    [
        'complete property reference',
        `•Cat(hat•"")\nboomy: Cat("none")\nboomy.**`,
        undefined,
        Replace,
        'boomy.hat',
    ],
    [
        'suggest sibling property when property reference is selected',
        `•Fun(a•# b•#)\nFun(1).a + 1`,
        (node: Node) =>
            node instanceof Reference && node.getName() === 'a',
        Replace,
        'b',
    ],
    [
        'suggest reference to replace node',
        `c: 1\n1 + 2`,
        (node: Node) =>
            node instanceof NumberLiteral && node.toWordplay() === '2',
        Replace,
        'c',
    ],
    [
        'suggest insertion of in scope bind in list',
        `a:'hello'\n[ "hi" **]`,
        undefined,
        Append,
        'a',
    ],
    [
        'suggest insertion of in scope bind in block',
        'a: 1\n**',
        undefined,
        Append,
        'a',
    ],
    ['suggest unit', '1**', undefined, Assign, 'ms'],
    [
        'suggest additional denominator',
        '1m**',
        (node) => node instanceof Unit,
        Replace,
        'm·min',
    ],
    [
        'suggest denominator',
        '1m**',
        (node) => node instanceof Unit,
        Replace,
        'm/s',
    ],
    [
        'suggest streams on stream placeholders',
        '∆ _•…_',
        (node) =>
            node instanceof ExpressionPlaceholder &&
            node.type instanceof StreamType,
        Replace,
        '🖱()',
    ],
    [
        'suggest negation on number expressions',
        '5',
        (node) => node instanceof NumberLiteral,
        Replace,
        '-5',
    ],
    [
        'suggest locale with region when Language is selected',
        "'hi'/en",
        (node) => node instanceof Language,
        Replace,
        '/es-MX',
    ],
    [
        'suggest locale with region when Language name token is selected',
        "'hi'/en",
        (node) =>
            node instanceof Token &&
            node.isSymbol(Sym.Name) &&
            node.getText() === 'en',
        Replace,
        '/es-MX',
    ],
    [
        'suggest alternative dimensions when Dimension name token is selected',
        '1m^2',
        (node) =>
            node instanceof Token &&
            node.isSymbol(Sym.Name) &&
            node.getText() === 'm',
        Replace,
        's^2',
    ],
    [
        'suggest alternative dimensions when a Unit denominator Dimension is selected',
        '1m/s',
        (node) => node instanceof Dimension && node.getName() === 's',
        Replace,
        'day',
    ],
    [
        'suggest whole-unit alternatives when the Unit slash token is selected',
        '1m/s',
        (node) =>
            node instanceof Token &&
            node.isSymbol(Sym.Language) &&
            node.getText() === '/',
        Replace,
        'day',
    ],
])(
    '%s: %s',
    (
        description: string,
        code: string,
        position: ((node: Node) => boolean) | undefined,
        kind: new (...params: never[]) => Revision,
        edit: string,
    ) => {
        // See if there's a placeholder for the caret.
        const insertionPoint = code.indexOf('**');
        if (insertionPoint >= 0)
            code =
                code.substring(0, insertionPoint) +
                code.substring(insertionPoint + 2);

        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const resolvedPosition =
            position === undefined
                ? insertionPoint
                : source.nodes().find((node) => position(node));
        expect(resolvedPosition).toBeDefined();
        if (resolvedPosition !== undefined) {
            const caret = new Caret(
                source,
                resolvedPosition,
                undefined,
                undefined,
                undefined,
            );
            const transforms = getEditsAt(
                project,
                caret,
                undefined,
                DefaultLocales,
            );

            const match = transforms.find((transform) => {
                const newNode = transform.getNewNode(DefaultLocales);
                return (
                    transform instanceof kind &&
                    newNode &&
                    newNode.toWordplay(getPreferredSpaces(newNode)) === edit
                );
            });
            if (match === undefined) {
                console.error(
                    transforms
                        .map(
                            (t) =>
                                `${t.constructor.name}\t${t
                                    .getNewNode(DefaultLocales)
                                    ?.toWordplay()}`,
                        )
                        .join('\n'),
                );
            }

            const newNode = match?.getNewNode(DefaultLocales);

            expect(
                newNode?.toWordplay(getPreferredSpaces(newNode)),
                description,
            ).toBe(edit);
        }
    },
);

test('default-value suggestions for an input only include values of its declared type', () => {
    // For an input typed `#`, the menu opened on its value placeholder should
    // not suggest values of incompatible types (booleans, text, etc.).
    const code = '•Fun(a•# b•# c•#: _)\nFun(1 2)';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const placeholder = source
        .nodes()
        .find(
            (n): n is ExpressionPlaceholder =>
                n instanceof ExpressionPlaceholder,
        );
    expect(placeholder).toBeDefined();
    if (!placeholder) return;

    const caret = new Caret(
        source,
        placeholder,
        undefined,
        undefined,
        undefined,
    );
    const transforms = getEditsAt(project, caret, undefined, DefaultLocales);

    const replacementCodes = transforms
        .filter((t) => t instanceof Replace)
        .map((t) => t.getNewNode(DefaultLocales)?.toWordplay() ?? '');

    // None of the replacements should be obviously wrong-typed literals.
    expect(replacementCodes).not.toContain('⊤');
    expect(replacementCodes).not.toContain('⊥');
    expect(replacementCodes).not.toContain("''");
});

test("default-value suggestions for a struct input do not include sibling inputs", () => {
    // In •Fun(a•# b•#), the default for b should not be allowed to reference
    // a — struct inputs aren't bound until after the object is constructed,
    // so a default-value expression can't resolve sibling inputs at runtime.
    const code = '•Fun(a•# b•#)';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const b = source
        .nodes()
        .find(
            (n): n is Bind =>
                n instanceof Bind && n.names.getNames()[0] === 'b',
        );
    expect(b).toBeDefined();
    if (!b) return;

    const transforms = getEditsAt(
        project,
        new Caret(source, 0, undefined, undefined, undefined),
        { parent: b, field: 'value', index: undefined },
        DefaultLocales,
    );

    const replacementCodes = transforms
        .map((t) => t.getNewNode(DefaultLocales)?.toWordplay() ?? '');
    expect(replacementCodes).not.toContain('a');
});

test('selecting a typed Bind with no default value suggests adding one', () => {
    // Clicking on a Bind like `a•#` (declared type, no default value)
    // should suggest a Replace adding a default value of the declared type.
    const code = '•Fun(a•# b•#)\nFun(1 2)';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const bind = source
        .nodes()
        .find(
            (n): n is Bind =>
                n instanceof Bind && n.names.getNames()[0] === 'a',
        );
    expect(bind).toBeDefined();
    if (!bind) return;
    const caret = new Caret(source, bind, undefined, undefined, undefined);
    const transforms = getEditsAt(project, caret, undefined, DefaultLocales);

    const replacements = transforms
        .filter((t) => t instanceof Replace)
        .map((t) => t.getNewNode(DefaultLocales))
        .filter((n): n is Bind => n instanceof Bind);

    // At least one Replace produces a Bind that's like the original but
    // with a default value of the declared (#) type.
    const withDefault = replacements.find(
        (b) =>
            b.names.getNames().includes('a') &&
            b.type !== undefined &&
            b.value !== undefined,
    );
    expect(withDefault, 'expected a Bind suggestion with a default value').toBeDefined();
});

test('appending an input to a struct in use suggests a Bind with a default value', () => {
    // The "+" button on a struct's input list opens the menu with a
    // FieldPosition anchor (parent = StructureDefinition, field = 'inputs',
    // index = end). The proposed Bind must include a default value or a
    // MissingInput conflict at the existing call site (Fun(1 3)) blocks
    // the suggestion in blocks mode.
    const code = '•Fun(a•# b•#)\nFun(1 3)';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const struct = source
        .nodes()
        .find((n): n is StructureDefinition => n instanceof StructureDefinition);
    expect(struct).toBeDefined();
    if (!struct) return;

    const caret = new Caret(source, 0, undefined, undefined, undefined);
    const transforms = getEditsAt(
        project,
        caret,
        { parent: struct, field: 'inputs', index: struct.inputs.length },
        DefaultLocales,
    );

    const newBinds = transforms
        .map((t) => t.getNewNode(DefaultLocales))
        .filter((n): n is Bind => n instanceof Bind);

    expect(newBinds.length).toBeGreaterThan(0);
    // Every suggested Bind for a struct input must have a default value so
    // existing call sites don't get a MissingInput conflict.
    for (const bind of newBinds) {
        expect(bind.value, 'suggested input should have a default').toBeDefined();
    }
});
