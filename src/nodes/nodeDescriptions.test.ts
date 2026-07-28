import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import type Node from './Node';

/**
 * Content-bearing nodes must describe their contents, not just their kind: a
 * screen reader user navigating code hears these at every caret stop, and a
 * static description makes every Input (or KeyValue, or Conditional...) sound
 * identical.
 *
 * Each case parses a program, finds the first node of the given type, and
 * asserts on the rendered description. Substring assertions, not equality:
 * the wording is locale-owned, the CONTENT is the contract.
 */
function describeFirst(
    code: string,
    predicate: (node: Node) => boolean,
): string {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const node = source.expression.nodes().find(predicate);
    if (node === undefined) throw new Error(`No matching node in ${code}`);
    return node.getDescription(DefaultLocales, context).toText();
}

function byType(name: string) {
    return (node: Node) => node.getDescriptor() === name;
}

test('literals are noun phrases, not actions', () => {
    // "Create number 5" described an inert value as an action.
    expect(describeFirst(`5m`, byType('NumberLiteral'))).toBe('5 m');
    expect(describeFirst(`'hi'`, byType('Translation'))).toBe("text 'hi'");
    expect(describeFirst(`⊤`, byType('BooleanLiteral'))).toBe('true');
    expect(describeFirst(`ø`, byType('NoneLiteral'))).toBe('nothing');
    expect(describeFirst(`[1 2 3]`, byType('ListLiteral'))).toBe(
        'list of 3 values',
    );
});

test('no literal description contains an action verb', () => {
    for (const [code, type] of [
        [`5m`, 'NumberLiteral'],
        [`'hi'`, 'TextLiteral'],
        [`⊤`, 'BooleanLiteral'],
        [`[1 2]`, 'ListLiteral'],
        [`{1 2}`, 'SetLiteral'],
        [`{'a': 1}`, 'MapLiteral'],
    ] as const) {
        expect(describeFirst(code, byType(type))).not.toMatch(/create/i);
    }
});

test('an Evaluate is name-first with its first argument', () => {
    const description = describeFirst(
        `Phrase('hi' size: 2m)`,
        byType('Evaluate'),
    );
    expect(description).toMatch(/^evaluate Phrase/);
    expect(description).toContain('hi');
    // The remaining arguments don't ride along.
    expect(description).not.toContain('2');
});

test('an Evaluate of an emoji-named function speaks the text name', () => {
    // Phrase's names are ['💬', 'Phrase']: symbolic names are confusing in
    // speech, so the text alias must win.
    const description = describeFirst(`Phrase('hi')`, byType('Evaluate'));
    expect(description).not.toContain('💬');
    expect(description).toContain('Phrase');
});

test('a definition with only a symbolic name still speaks it', () => {
    const description = describeFirst(`•➕(n•#)\n➕(1)`, byType('Evaluate'));
    expect(description).toContain('➕');
});

test('a child reference is concise, never a nested sentence', () => {
    // A KeyValue whose value is an Evaluate must reference it by type, not
    // embed "evaluate ..." inside "mapping ...".
    const description = describeFirst(
        `•Cat(hats•#)\n{'a': Cat(1)}`,
        byType('KeyValue'),
    );
    expect(description).toContain('a');
    expect(description).toContain('Cat');
    expect(description).not.toContain('evaluate');
});

test('a unary operation names its operator', () => {
    // $operator was declared with no producer, so every unary expression
    // rendered as the unparsable-template message.
    const description = describeFirst(`-(1)`, byType('UnaryEvaluate'));
    expect(description.toLowerCase()).not.toContain('unparsable');
    expect(description).toMatch(/^operation/);
});

test('a binary operation names operator and concise operands', () => {
    const description = describeFirst(`1 + 2`, byType('BinaryEvaluate'));
    expect(description.toLowerCase()).not.toContain('unparsable');
    expect(description).toContain('1');
    expect(description).toContain('2');
});

test('an Input names itself and its value type', () => {
    // Amy's report: `resting: Sequence(…)` announced only "Declare a named
    // function input", indistinguishable from every other input.
    const description = describeFirst(
        `Phrase('cat' resting: Sequence({0%: Pose()} 2s))`,
        byType('Input'),
    );
    expect(description).toContain('resting');
    expect(description).toContain('Sequence');
});

test('a name token speaks its text, not just "name"', () => {
    // "name, between n and g" said nothing about WHICH name; now the token's
    // text rides along: "name resting".
    const description = describeFirst(
        `Phrase('cat' resting: Pose())`,
        (node) =>
            node.getDescriptor() === 'Token' &&
            node.toWordplay() === 'resting',
    );
    expect(description).toContain('name');
    expect(description).toContain('resting');
});

test('a fixed symbol token is just its label', () => {
    const description = describeFirst(
        `1 + 2`,
        (node) =>
            node.getDescriptor() === 'Token' && node.toWordplay() === '+',
    );
    // No trailing text: the label already identifies a fixed symbol.
    expect(description.trim()).not.toMatch(/\+/);
});

test('a Conditional is name-first and names its condition', () => {
    const description = describeFirst(`⊤ ? 1 2`, byType('Conditional'));
    expect(description).toMatch(/^conditional/);
    expect(description).toContain('true');
});

test('a KeyValue segments its key and value with keywords', () => {
    // The two sub-descriptions run together without the "key"/"value" markers.
    const description = describeFirst(`{'a': 1}`, byType('KeyValue'));
    expect(description).toContain('key');
    expect(description).toContain('value');
    expect(description).toContain('a');
    expect(description).toContain('1');
});

test('a ListAccess names the list and index', () => {
    const description = describeFirst(`[1 2 3][2]`, byType('ListAccess'));
    expect(description).toContain('2');
});

test('a Program counts its statements', () => {
    const description = describeFirst(`1\n2\n3`, byType('Program'));
    expect(description).toContain('3');
});

test('a Match counts its cases', () => {
    const description = describeFirst(
        `1 ??? 1: 'a' 2: 'b' 'c'`,
        byType('Match'),
    );
    expect(description).toContain('2');
});

test('a placeholder without a type takes the fallback branch', () => {
    // An undefined input outside a branch renders the whole template as the
    // "unparsable" message — the regression class from ui.edit.between.
    const description = describeFirst(`_`, byType('ExpressionPlaceholder'));
    expect(description.toLowerCase()).not.toContain('unparsable');
    expect(description.length).toBeGreaterThan(0);
});

test('a language tag without a region takes the fallback branch', () => {
    const description = describeFirst(`name/en: 1`, byType('Language'));
    expect(description).toContain('en');
    expect(description.toLowerCase()).not.toContain('unparsable');
});

test('a dimension speaks its localized template, not hard-coded English', () => {
    // Dimension.getDescription used to bypass the locale system with an
    // English unit table.
    const description = describeFirst(`1m`, byType('Dimension'));
    expect(description).toContain('m');
    expect(description.toLowerCase()).not.toContain('unparsable');
});

test('a structure type reads as its name', () => {
    const description = describeFirst(
        `•Cat(hats•#)\nc: Cat(1)\nc`,
        byType('Reference'),
    );
    // The reference itself names the bound name; this is a sanity check that
    // rendering still resolves.
    expect(description).toContain('c');
});

test('every changed template renders without the unparsable fallback', () => {
    // One program touching every retemplated node kind; none may leak the
    // "unparsable template" message a missing input produces.
    const programs = [
        `Phrase('cat' resting: Pose())`,
        `{'a': 1}`,
        `⊤ ? 1 2`,
        `[1 2 3][2]`,
        `{1 2}{1}`,
        `1 ??? 1: 'a' 'b'`,
        `1 ?? 2`,
        `1 → ''`,
        `∆ Time()`,
        `1m`,
        `_`,
        `name/en: 1`,
        `🌎/en`,
        `-(1)`,
        `1 + 2`,
        `a: 5\na`,
        `ƒ f(x•#) x\nf(1)`,
        `•Cat(hats•#)\nCat(1).hats`,
    ];
    for (const code of programs) {
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const context = project.getContext(source);
        for (const node of source.expression.nodes()) {
            const text = node
                .getDescription(DefaultLocales, context)
                .toText()
                .toLowerCase();
            expect(
                text.includes('unparsable'),
                `${node.getDescriptor()} in ${code} rendered: ${text}`,
            ).toBe(false);
        }
    }
});
