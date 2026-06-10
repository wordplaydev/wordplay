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
import ListLiteral from '@nodes/ListLiteral';
import ConceptLink from '@nodes/ConceptLink';
import FormattedLiteral from '@nodes/FormattedLiteral';
import FormattedTranslation from '@nodes/FormattedTranslation';
import Markup from '@nodes/Markup';

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
        (node: Node) => node instanceof Reference && node.getName() === 'a',
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
        'suggest translate (↦) on a collection',
        '[1 2 3]',
        (node) => node instanceof ListLiteral,
        Replace,
        '[1 2 3] ↦ _•#',
    ],
    [
        'suggest this (⬚) in a translate body',
        '[1 2 3] ↦ _',
        (node) => node instanceof ExpressionPlaceholder,
        Replace,
        '⬚',
    ],
    [
        'suggest this (⬚) in a reaction',
        '1 … ∆ Time() … _',
        (node) => node instanceof ExpressionPlaceholder,
        Replace,
        '⬚',
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

test('default-value suggestions for a struct input do not include sibling inputs', () => {
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
        new Caret(source, 0, undefined, undefined),
        { parent: b, field: 'value', index: undefined },
        DefaultLocales,
    );

    const replacementCodes = transforms.map(
        (t) => t.getNewNode(DefaultLocales)?.toWordplay() ?? '',
    );
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
    const caret = new Caret(source, bind, undefined, undefined);
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
    expect(
        withDefault,
        'expected a Bind suggestion with a default value',
    ).toBeDefined();
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
        .find(
            (n): n is StructureDefinition => n instanceof StructureDefinition,
        );
    expect(struct).toBeDefined();
    if (!struct) return;

    const caret = new Caret(source, 0, undefined, undefined);
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
        expect(
            bind.value,
            'suggested input should have a default',
        ).toBeDefined();
    }
});

test('any markup position recommends available custom characters as concept links', () => {
    // A formatted literal with the caret inside its markup. The menu should
    // offer to insert a concept link to each available custom character.
    let code = '`hello**`';
    const insertionPoint = code.indexOf('**');
    code =
        code.substring(0, insertionPoint) + code.substring(insertionPoint + 2);
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(
        source,
        insertionPoint,
        undefined,
        undefined,
    );
    const transforms = getEditsAt(
        project,
        caret,
        undefined,
        DefaultLocales,
        undefined,
        ['me/Star'],
    );
    const link = transforms
        .map((t) => t.getNewNode(DefaultLocales))
        .find(
            (n): n is ConceptLink =>
                n instanceof ConceptLink && n.toWordplay() === '@me/Star',
        );
    expect(link, 'expected a @me/Star concept link insertion').toBeDefined();
});

test('a partially typed link completes to a matching custom character', () => {
    // Typing `@me` inside markup should complete to the available `me/Star`
    // custom character, just as it would complete a concept.
    let code = '`@me**`';
    const insertionPoint = code.indexOf('**');
    code =
        code.substring(0, insertionPoint) + code.substring(insertionPoint + 2);
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(
        source,
        insertionPoint,
        undefined,
        undefined,
    );
    const transforms = getEditsAt(
        project,
        caret,
        undefined,
        DefaultLocales,
        undefined,
        ['me/Star'],
    );
    const link = transforms
        .filter((t) => t instanceof Replace)
        .map((t) => t.getNewNode(DefaultLocales))
        .find(
            (n): n is ConceptLink =>
                n instanceof ConceptLink && n.toWordplay() === '@me/Star',
        );
    expect(link, 'expected @me to complete to @me/Star').toBeDefined();
});

test('a position expecting a formatted translation recommends custom characters', () => {
    // Adding a translation to a formatted literal's `texts` list should offer,
    // alongside an empty translation, one linking to each available character.
    const code = '`hello`';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const literal = source
        .nodes()
        .find((n): n is FormattedLiteral => n instanceof FormattedLiteral);
    expect(literal).toBeDefined();
    if (!literal) return;

    const transforms = getEditsAt(
        project,
        new Caret(source, 0, undefined, undefined),
        { parent: literal, field: 'texts', index: literal.texts.length },
        DefaultLocales,
        undefined,
        ['me/Star'],
    );
    const translation = transforms
        .map((t) => t.getNewNode(DefaultLocales))
        .find((n) => n?.toWordplay().includes('@me/Star'));
    expect(
        translation,
        'expected a formatted translation linking to @me/Star',
    ).toBeDefined();
});

test('an empty markup placeholder can be replaced with a custom character', () => {
    // Selecting the empty markup placeholder inside a formatted literal (``)
    // should offer replacing it with markup linking to each custom character.
    const code = '``';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const markup = source.nodes().find((n): n is Markup => n instanceof Markup);
    expect(markup).toBeDefined();
    if (!markup) return;

    const transforms = getEditsAt(
        project,
        new Caret(source, markup, undefined, undefined),
        undefined,
        DefaultLocales,
        undefined,
        ['me/Star'],
    );
    // The replacement must both be offered and actually apply to the source.
    const applied = transforms
        .filter((t) => t instanceof Replace)
        .map((t) => {
            const edit = t.getEdit(DefaultLocales);
            return Array.isArray(edit)
                ? edit[0].getCode().toString()
                : undefined;
        })
        .find((wp) => wp === '`@me/Star`');
    expect(
        applied,
        'expected replacing the markup placeholder to yield `@me/Star`',
    ).toBeDefined();
});

test('markup built for a custom character carries spaces so it can render', () => {
    // Markup with no spaces fails to render as output ("unable to render markup
    // without spaces"), so the markup we build for a character must have them.
    const literal = new FormattedLiteral([
        FormattedTranslation.makeWithLink('creator/Star'),
    ]);
    expect(literal.texts[0].markup.spaces).toBeDefined();
});

test('a selected placeholder expecting formatted text recommends custom characters', () => {
    // Phrase's text input accepts `""|`…``, so a selected placeholder in
    // Phrase(_) should offer a formatted literal linking to each character.
    const code = 'Phrase(_)';
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

    const transforms = getEditsAt(
        project,
        new Caret(source, placeholder, undefined, undefined),
        undefined,
        DefaultLocales,
        undefined,
        ['creator/Star'],
    );
    const literal = transforms
        .map((t) => t.getNewNode(DefaultLocales))
        .find(
            (n): n is FormattedLiteral =>
                n instanceof FormattedLiteral &&
                n.toWordplay() === '`@creator/Star`',
        );
    expect(
        literal,
        'expected a `@creator/Star` formatted literal at the placeholder',
    ).toBeDefined();
});

test('a caret inside an empty formatted literal recommends custom characters', () => {
    // The caret between the ticks of an empty formatted literal (``) should
    // offer filling it with a custom character, and the edit must apply.
    const code = '``';
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);

    const transforms = getEditsAt(
        project,
        new Caret(source, 1, undefined, undefined),
        undefined,
        DefaultLocales,
        undefined,
        ['creator/Star'],
    );
    const applied = transforms
        .map((t) => {
            const edit = t.getEdit(DefaultLocales);
            return Array.isArray(edit)
                ? edit[0].getCode().toString()
                : undefined;
        })
        .find((wp) => wp === '`@creator/Star`');
    expect(
        applied,
        'expected filling the empty literal to yield `@creator/Star`',
    ).toBeDefined();
});
