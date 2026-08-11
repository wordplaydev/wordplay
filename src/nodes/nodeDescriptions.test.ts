import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';
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

test('a list type names what it holds, at every position', () => {
    // A list type of several positions can't point at a single node, so it names them all; a
    // listener otherwise hears the same "list type" for `[#]` and `[# '']`.
    expect(describeFirst(`a•[#]: [1]\na`, byType('ListType'))).toContain(
        'number',
    );
    const positions = describeFirst(`a•[# '']: [1 'hi']\na`, byType('ListType'));
    expect(positions).toContain('number');
    expect(positions).toContain('text');
    expect(describeFirst(`a•[]: [1]\na`, byType('ListType'))).toBe('list type');
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
            node.getDescriptor() === 'Token' && node.toWordplay() === 'resting',
    );
    expect(description).toContain('name');
    expect(description).toContain('resting');
});

test('a fixed symbol token is just its label', () => {
    const description = describeFirst(
        `1 + 2`,
        (node) => node.getDescriptor() === 'Token' && node.toWordplay() === '+',
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

describe('counts are grammatical at one', () => {
    // "list of 1 values" was the report (#1250); every count-bearing
    // description now chooses a form for the number it's describing.
    test('one is singular, and other counts are plural', () => {
        expect(describeFirst(`[1]`, byType('ListLiteral'))).toBe(
            'list of 1 value',
        );
        expect(describeFirst(`[1 2]`, byType('ListLiteral'))).toBe(
            'list of 2 values',
        );
        expect(describeFirst(`{1}`, byType('SetLiteral'))).toBe(
            'set of 1 value',
        );
        expect(describeFirst(`{'a':1}`, byType('MapLiteral'))).toBe(
            'map of 1 key-value pair',
        );
        expect(describeFirst(`1`, byType('Program'))).toBe(
            'program with 1 statement',
        );
    });

    test('zero takes the plural form in English', () => {
        expect(describeFirst(`[]`, byType('ListLiteral'))).toBe(
            'list of 0 values',
        );
    });
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

describe('markup and documentation nodes name their contents', () => {
    // A caret lands on every one of these inside every doc, and each said the
    // same phrase for every instance before #1252.
    const doc = `¶Hello there¶/en\n5`;

    test('a doc list names the languages it holds', () => {
        // In their own language: that's how a reader of that doc knows it.
        expect(describeFirst(doc, byType('Docs'))).toContain('English');
    });

    test('a doc names its language and how long it is', () => {
        const description = describeFirst(doc, byType('Doc'));
        expect(description).toContain('English');
        expect(description).toContain('2');
    });

    test('a doc without a language tag still describes its length', () => {
        const description = describeFirst(`¶Hello there¶\n5`, byType('Doc'));
        expect(description.toLowerCase()).not.toContain('unparsable');
        expect(description).toContain('2');
    });

    test('a paragraph speaks its text', () => {
        expect(describeFirst(doc, byType('Paragraph'))).toContain(
            'Hello there',
        );
    });

    test('words speak their text', () => {
        // Plain prose is a Words *token*; a format delimiter makes a Words node.
        expect(describeFirst(`¶/hello there/¶\n5`, byType('Words'))).toContain(
            'hello there',
        );
    });

    test('an example speaks its code, spaced to be read aloud', () => {
        // Spacing lives in the containing markup, so the code would otherwise
        // run together as "1+2".
        expect(
            describeFirst(`¶Adding: \\1 + 2\\¶\n5`, byType('Example')),
        ).toContain('1 + 2');
    });

    test('a markup choice names what it branches on', () => {
        expect(describeFirst(`¶$x[yes|no]¶\n5`, byType('Branch'))).toContain(
            'x',
        );
    });

    test('a mention names what it mentions, not its node id', () => {
        // getDescriptionInputs returned `this.id`, so every mention announced
        // a meaningless number.
        const description = describeFirst(`¶$x¶\n5`, byType('Mention'));
        expect(description).toContain('x');
        expect(description).not.toMatch(/\d/);
    });

    test('two different docs describe differently', () => {
        // A description that doesn't vary is heard once and then sounds broken:
        // an unchanged live region is silent.
        const one = `¶Hello there¶/en\n5`;
        const two = `¶Adiós amigos mios¶/es\n5`;
        for (const type of ['Docs', 'Doc', 'Paragraph'])
            expect(describeFirst(one, byType(type))).not.toBe(
                describeFirst(two, byType(type)),
            );
    });
});

describe('pattern nodes name their contents', () => {
    test('a capture speaks its name', () => {
        expect(
            describeFirst(`'ab' ⌕ ⣿y:(4 #)⣿`, byType('PatternCapture')),
        ).toContain('y');
    });

    test('a literal speaks the characters it matches', () => {
        expect(
            describeFirst(`'ab' ⌕ ⣿"-"⣿`, byType('PatternLiteralText')),
        ).toContain('-');
    });

    test('a range speaks both endpoints', () => {
        const description = describeFirst(
            `'ab' ⌕ ⣿{"a"–"z"}⣿`,
            byType('PatternRange'),
        );
        expect(description).toContain('a');
        expect(description).toContain('z');
    });
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
        `¶Hello there¶/en\n5`,
        `¶Hello there¶\n5`,
        `¶¶\n5`,
        `¶/hello there/¶\n5`,
        `¶Adding: \\1 + 2\\¶\n5`,
        `¶$x[yes|no]¶\n5`,
        `'ab' ⌕ ⣿y:(4 #)⣿`,
        `'ab' ⌕ ⣿"-"⣿`,
        `'ab' ⌕ ⣿{"a"–"z"}⣿`,
        `a•[# '']: [1 'hi']\na`,
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

describe('condition slots describe the test, not its type', () => {
    // "conditional on boolean type" is true of every conditional ever
    // written; the type of a test says nothing a listener can use.
    test('a compound condition is described, not typed', () => {
        const description = describeFirst(
            `n: 5\n(n > 3) ? 'big' 'small'`,
            byType('Conditional'),
        );
        expect(description).toContain('operation');
        expect(description).not.toContain('boolean type');
    });

    test('parentheses around a condition are not announced', () => {
        // `(x)` parses as a single-statement block, which would otherwise
        // describe as "block of 1 statements".
        const description = describeFirst(
            `n: 5\n(n > 3) ? 'big' 'small'`,
            byType('Conditional'),
        );
        expect(description).not.toContain('block');
    });

    test('a real multi-statement block is still a block', () => {
        expect(describeFirst(`x: (a: 1\na + 1)\nx`, byType('Block'))).toContain(
            'block',
        );
    });

    test('a named or literal condition stays short', () => {
        expect(
            describeFirst(`awake: \u22a4\nawake ? 1 2`, byType('Conditional')),
        ).toBe('conditional on awake');
        expect(describeFirst(`\u22a4 ? 1 2`, byType('Conditional'))).toBe(
            'conditional on true',
        );
    });

    test('a changed check names its stream', () => {
        const description = describeFirst(`\u2206 Time()`, byType('Changed'));
        expect(description).toContain('Time');
        expect(description).not.toContain('number type');
    });
});
