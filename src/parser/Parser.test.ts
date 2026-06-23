/* eslint-disable @typescript-eslint/ban-types */
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import BooleanLiteral from '@nodes/BooleanLiteral';
import BooleanType from '@nodes/BooleanType';
import Borrow from '@nodes/Borrow';
import Conditional from '@nodes/Conditional';
import ConversionDefinition from '@nodes/ConversionDefinition';
import ConversionType from '@nodes/ConversionType';
import Convert from '@nodes/Convert';
import Doc from '@nodes/Doc';
import DocumentedExpression from '@nodes/DocumentedExpression';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import Input from '@nodes/Input';
import Insert from '@nodes/Insert';
import Is from '@nodes/Is';
import ListAccess from '@nodes/ListAccess';
import ListLiteral from '@nodes/ListLiteral';
import ListType from '@nodes/ListType';
import MapLiteral from '@nodes/MapLiteral';
import MapType from '@nodes/MapType';
import NameType from '@nodes/NameType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import Otherwise from '@nodes/Otherwise';
import Paragraph from '@nodes/Paragraph';
import Previous from '@nodes/Previous';
import Program from '@nodes/Program';
import PropertyReference from '@nodes/PropertyReference';
import Reaction from '@nodes/Reaction';
import Reference from '@nodes/Reference';
import Select from '@nodes/Select';
import SetLiteral from '@nodes/SetLiteral';
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import SetType from '@nodes/SetType';
import StreamType from '@nodes/StreamType';
import StructureDefinition from '@nodes/StructureDefinition';
import TableLiteral from '@nodes/TableLiteral';
import TableType from '@nodes/TableType';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import Token from '@nodes/Token';
import TypeInputs from '@nodes/TypeInputs';
import TypePlaceholder from '@nodes/TypePlaceholder';
import UnionType from '@nodes/UnionType';
import UnparsableExpression from '@nodes/UnparsableExpression';
import UnparsableType from '@nodes/UnparsableType';
import Update from '@nodes/Update';
import WebLink from '@nodes/WebLink';
import Words from '@nodes/Words';
import { expect, test } from 'vitest';
import { readProjects } from '../examples/readProjects';
import Delete from '@nodes/Delete';
import Docs from '@nodes/Docs';
import Example from '@nodes/Example';
import FormattedLiteral from '@nodes/FormattedLiteral';
import FormattedTranslation from '@nodes/FormattedTranslation';
import FormattedType from '@nodes/FormattedType';
import IsLocale from '@nodes/IsLocale';
import Language from '@nodes/Language';
import Names from '@nodes/Names';
import Row from '@nodes/Row';
import Translation from '@nodes/Translation';
import TypeVariables from '@nodes/TypeVariables';
import Unit from '@nodes/Unit';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import parseDoc from '@parser/parseDoc';
import { parseBlock } from '@parser/parseExpression';
import parseProgram, { toProgram } from '@parser/parseProgram';
import { Sym } from '@nodes/Sym';
import { NONE_SYMBOL, PLACEHOLDER_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import { tokens } from '@parser/Tokenizer';
import { toTokens } from '@parser/toTokens';

export const everything = `
¶Testing *the /way/*¶
•Cat() (
	ƒ num() [1 2 3][1]
)

d/en: ⎡a•# b•# c•#⎦
	⎡1 2 3⎦
	⎡4 5 6⎦ ⎡+1 2 3⎦
a,o: (
		b•#: Cat().num()
		c: {1: b}{1}
		c ?? 1s^2
	)
(a + (d ⎡?a⎦ ⊤) → [][1].a) → "" + 'hi' + (1 … ∆ Time(1000ms) & 🌏/en … ⊤ ? 1 2) → ""`;

test('Parse programs', () => {
    expect(toProgram('')).toBeInstanceOf(Program);
    expect(toProgram('hi')).toBeInstanceOf(Program);
});

test('Parse borrows', () => {
    const good = toProgram('↓ mouse');
    expect(good.borrows).toHaveLength(1);
    expect(good.borrows[0]).toBeInstanceOf(Borrow);
    expect((good.borrows[0] as Borrow).source).toBeInstanceOf(Reference);

    const prop = toProgram('↓ time.clock');
    expect(prop.borrows).toHaveLength(1);
    expect(prop.borrows[0]).toBeInstanceOf(Borrow);
    expect((prop.borrows[0] as Borrow).name).toBeInstanceOf(Reference);
});

test('Parse shares', () => {
    const good = toProgram('↑ fancy: 1');
    expect(good.expression).toBeInstanceOf(Block);
    expect((good.expression as Block).statements).toHaveLength(1);
    expect((good.expression as Block).statements[0]).toBeInstanceOf(Bind);
});

test('Unparsable runaways', () => {
    const program = toProgram('a:\nb: [\n] 1');
    expect(program.expression.statements.length).toBe(3);
    expect(program.expression.statements[0]).toBeInstanceOf(Bind);
    expect(program.expression.statements[1]).toBeInstanceOf(
        UnparsableExpression,
    );
    expect(program.expression.statements[2]).toBeInstanceOf(
        UnparsableExpression,
    );
});

test.each([
    ['(\nhi\n)', Block],
    ['¶Nothing¶\n(hi)', Block],
    ['a: 1', Bind, 'value', NumberLiteral, '1'],
    ['a•#: 1', Bind, 'type', NumberType, '#'],
    ['a/en, b/es•#: 1', Bind, 'names', Names],
    ['¶program¶\n\n¶Some letters¶/en a/en, b/es: 1', Bind, 'docs', Docs],
    [PLACEHOLDER_SYMBOL, ExpressionPlaceholder],
    ['boomy', Reference],
    [NONE_SYMBOL, NoneLiteral],
    [TRUE_SYMBOL, BooleanLiteral, 'value', Token, TRUE_SYMBOL],
    ['1s', NumberLiteral, 'unit', Unit, 's'],
    ['1m/s', NumberLiteral, 'unit', Unit, 'm/s'],
    ['1cat^2·dog/s', NumberLiteral, 'unit', Unit, 'cat^2·dog/s'],
    ['«hola»', TextLiteral],
    [
        '"My cat\'s name is \\name + name\\, what\'s yours?"',
        TextLiteral,
        'texts',
        Array,
        Translation,
    ],
    ['«hola»/spa', TextLiteral],
    ['[1 2 3]', ListLiteral, 'values', Array, 3],
    ['[1 -2]', ListLiteral, 'values', Array, 2],
    ['list[2]', ListAccess, 'index', NumberLiteral],
    ['list[2][3]', ListAccess, 'list', ListAccess, 'list[2]'],
    ['{1 2 3}', SetLiteral],
    ['{:}', MapLiteral, 'bind', Token, ':'],
    ['{1:1 2:2: 3:3}', MapLiteral, 'values', Array, 3],
    ['set{2}', SetOrMapAccess, 'key', NumberLiteral, '2'],
    ['set{2}{3}', SetOrMapAccess, 'setOrMap', SetOrMapAccess, 'set{2}'],
    [
        '⎡a•# b•# c•#⎦\n⎡1 2 3⎦\n⎡4 5 6⎦',
        TableLiteral,
        'type',
        TableType,
        '⎡a•# b•# c•#⎦',
    ],
    ['table ⎡? a b ⎦ c > 3', Select, 'query', BinaryEvaluate, 'c > 3'],
    ['table ⎡+ 1 2 3 ⎦', Insert, 'row', Row],
    ['table ⎡- c > 3', Delete, 'query', BinaryEvaluate],
    ['table ⎡: a: 1 ⎦ b > 5', Update, 'query', BinaryEvaluate, 'b > 5'],
    ['0 … Button() … a + 1', Reaction, 'next', BinaryEvaluate, 'a + 1'],
    ['← 1 stream', Previous, 'stream', Reference, 'stream'],
    ['←← 10 stream', Previous, 'range', Token, '←'],
    ['1 + 2 + 3 + 4', BinaryEvaluate, 'right', NumberLiteral],
    ['123•#', Is, 'type', NumberType],
    ['123 • #', Is, 'type', NumberType],
    ['🌍/', IsLocale, 'locale', Language],
    ['🌏/en', IsLocale, 'locale', Language],
    ['🌎/en-US', IsLocale, 'locale', Language],
    ['a ? b c ? d e', Conditional, 'condition', Reference, 'a'],
    ['a ? b c ? d e', Conditional, 'no', Conditional, 'c ? d e'],
    ['a ?? b', Otherwise, 'right', Reference, 'b'],
    ['a ?? b ?? c', Otherwise, 'right', Otherwise, 'b ?? c'],
    ['ƒ(a b) _', FunctionDefinition, 'inputs', Array, 2],
    ['ƒ() _', FunctionDefinition, 'inputs', Array, 0],
    ['ƒ() •# _', FunctionDefinition, 'output', NumberType],
    [
        'ƒ(a b) •# a + b',
        FunctionDefinition,
        'expression',
        BinaryEvaluate,
        'a + b',
    ],
    [
        '¶program¶\n\n¶Add things¶/en\nƒ(a b) a = b',
        FunctionDefinition,
        'docs',
        Docs,
    ],
    [
        '¶Program¶\n\n¶Number one¶/en ¶Numero uno¶/es ƒ(a b) a = b',
        FunctionDefinition,
        'docs',
        Docs,
    ],
    ['ƒ⸨T⸩(a: T b: T) a + b', FunctionDefinition, 'types', TypeVariables],
    ['a()', Evaluate, 'fun', Reference, 'a'],
    ['a(1 2)', Evaluate, 'inputs', Array, 2],
    ['a(b:2 c:2)', Evaluate, 'inputs', Array, Input],
    ['a⸨Cat⸩(b c)', Evaluate, 'types', TypeInputs],
    ['a⸨Cat #⸩(b c)', Evaluate, 'types', TypeInputs],
    ["→ # '' meow()", ConversionDefinition, 'output', TextType],
    [
        "¶Program¶\n\n¶numtotext¶/en → # '' meow()",
        ConversionDefinition,
        'docs',
        Docs,
    ],
    ['(1 + 2) → ""', Convert, 'type', TextType],
    [
        "•Cat(species•'') ( meow: ƒ() say(species) )",
        StructureDefinition,
        'inputs',
        Array,
        1,
    ],
    [
        "•Cat Mammal(species•'') ( meow: ƒ() say(species) )",
        StructureDefinition,
        'interfaces',
        Array,
        1,
    ],
    [
        "•Cat,🐈/😀⸨Breed⸩(species•'') ( meow: ƒ() say(species) )",
        StructureDefinition,
        'types',
        TypeVariables,
    ],
    [
        "•Cat Mammal⸨S⸩(species•'') ( meow: ƒ() say(species) )",
        StructureDefinition,
        'interfaces',
        Array,
        1,
    ],
    ['a.b', PropertyReference, 'name', Reference, 'b'],
    ['a.b.c()[d]{f}', SetOrMapAccess, 'setOrMap', ListAccess],
    [
        "¶Program¶\n\n¶let's see it¶\n\n¶Testing¶/en\na",
        DocumentedExpression,
        'expression',
        Reference,
        'a',
    ],
    [
        '`my /fancy/ words`',
        FormattedLiteral,
        'texts',
        Array,
        FormattedTranslation,
    ],
    ['a•_', Bind, 'type', TypePlaceholder],
    ['a•Cat', Bind, 'type', NameType],
    ['a•?', Bind, 'type', BooleanType],
    ['a•#', Bind, 'type', NumberType],
    ['a•1', Bind, 'type', NumberType],
    ['a•""', Bind, 'type', TextType],
    ['a•"hi"', Bind, 'type', TextType],
    ['a•ø', Bind, 'type', NoneType],
    ['a•[#]', Bind, 'type', ListType, '[#]'],
    ['a•{#}', Bind, 'type', SetType, '{#}'],
    ['a•{#:""}', Bind, 'type', MapType, '{#:""}'],
    ['a•⎡a•# b•"" c•Cat⎦', Bind, 'type', TableType, '⎡a•# b•"" c•Cat⎦'],
    ['a•ƒ(a•# b•#) #', Bind, 'type', FunctionType],
    ['a•…#', Bind, 'type', StreamType],
    ['a•Cat|#', Bind, 'type', UnionType],
    ['a•`…`', Bind, 'type', FormattedType],
    ['a•→# ""', Bind, 'type', ConversionType],
    ['a•/', Bind, 'type', UnparsableType],
])(
    '%s -> %o',
    (
        code: string,
        kind: Function,
        property?: string,
        propertyKind?: Function,
        propertyValue?: string | number | boolean | Function,
    ) => {
        const block = toProgram(code).expression;
        expect(block.statements.length).toBe(1);
        const statement = block.statements[0];
        expect(statement instanceof kind);
        if (property !== undefined && propertyKind !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const field = (statement as any)[property];
            expect(field).toBeInstanceOf(propertyKind);
            if (propertyKind === Array) {
                if (propertyValue instanceof Function)
                    expect(field[0]).toBeInstanceOf(propertyValue);
                else if (typeof propertyValue === 'number')
                    expect(field.length).toBe(propertyValue);
            } else {
                if (typeof propertyValue === 'string')
                    expect(field?.toWordplay(getPreferredSpaces(field))).toBe(
                        propertyValue,
                    );
                else if (propertyValue !== undefined)
                    expect(field).toBe(propertyValue);
            }
        }
    },
);

test('Blocks and binds', () => {
    const map = parseBlock(toTokens('{1:1 2:2 3:3}'));
    expect(map).toBeInstanceOf(Block);
    expect((map as Block).statements[0]).toBeInstanceOf(MapLiteral);

    const bindMap = parseBlock(toTokens('map: {1:1 2:2 3:3}'));
    expect(bindMap).toBeInstanceOf(Block);
    expect((bindMap as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindMap as Block).statements[0] as Bind).value).toBeInstanceOf(
        MapLiteral,
    );

    const table = parseBlock(toTokens('⎡a•# b•#⎦\n⎡1 2⎦'));
    expect(table).toBeInstanceOf(Block);
    expect((table as Block).statements[0]).toBeInstanceOf(TableLiteral);

    const bindTable = parseBlock(toTokens('table: ⎡a•# b•#⎦\n⎡1 2⎦'));
    expect(bindTable).toBeInstanceOf(Block);
    expect((bindTable as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindTable as Block).statements[0] as Bind).value).toBeInstanceOf(
        TableLiteral,
    );

    const bindTypedTable = parseBlock(toTokens('table•⎡a•# b•#⎦: ⎡a•# b•#⎦'));
    expect(bindTypedTable).toBeInstanceOf(Block);
    expect((bindTypedTable as Block).statements[0]).toBeInstanceOf(Bind);
    expect(
        ((bindTypedTable as Block).statements[0] as Bind).type,
    ).toBeInstanceOf(TableType);
    expect(
        ((bindTypedTable as Block).statements[0] as Bind).value,
    ).toBeInstanceOf(TableLiteral);
});

test('plain docs', () => {
    const doc = parseDoc(toTokens('¶this is what I am.¶'));
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[0].segments[0]).toBeInstanceOf(Words);
    expect(doc.markup.paragraphs[0].segments.length).toBe(1);
});

test('multi-paragraph docs', () => {
    const doc = parseDoc(
        toTokens('¶this is what I am.\n\nthis is another point.¶'),
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[1]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs.length).toBe(2);
});

test('linked docs', () => {
    const doc = parseDoc(
        toTokens('¶go see more at <wikipedia@https://wikipedia.org>.¶'),
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    const words = doc.markup.paragraphs[0].segments[0];
    expect(words).toBeInstanceOf(Words);
    expect((words as Words).segments[1]).toBeInstanceOf(WebLink);
    expect(((words as Words).segments[1] as WebLink).url?.getText()).toBe(
        'https://wikipedia.org',
    );
});

test('docs in docs', () => {
    const doc = parseDoc(
        toTokens("¶This is a doc: \\¶my doc¶\\. Don't you see it?¶"),
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    const words = doc.markup.paragraphs[0].segments[0];
    expect(words).toBeInstanceOf(Words);
    expect((words as Words).segments[1]).toBeInstanceOf(Example);
    expect((words as Words).segments[2]).toBeInstanceOf(Token);
    expect((words as Words).segments.length).toBe(3);
});

test('an example with an unclosed bracket stops at its boundary, not a later one', () => {
    // `\(\` must be its own example `(`, not merge with a later `\)\` — a nested
    // block in an example stops at the example boundary `\`, even unclosed.
    const examplesOf = (markupSource: string) =>
        parseDoc(toTokens(`¶${markupSource}¶`))
            .nodes()
            .filter((n): n is Example => n instanceof Example)
            .map((e) => e.program.toWordplay().trim());
    // Two separate examples, with the prose between them left as prose.
    expect(examplesOf('group with \\(\\ and \\)\\ here')).toEqual(['(', ')']);
    // A complete bracketed example is bounded by its own close, not the next `\`.
    expect(examplesOf('like \\(◌ | #)\\ or \\year:(4 #)\\.')).toEqual([
        '(◌|#)',
        'year:(4#)',
    ]);
});

test('unparsables in docs', () => {
    const doc = parseDoc(
        toTokens(
            "¶This is a broken example ina doc: \\∆\\. Don't you see it?¶",
        ),
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    const words = doc.markup.paragraphs[0].segments[0];
    expect(words).toBeInstanceOf(Words);
    expect((words as Words).segments[1]).toBeInstanceOf(Example);
    expect((words as Words).segments[2]).toBeInstanceOf(Token);
    expect((words as Words).segments.length).toBe(3);
});

test('unparsables in blocks', () => {
    const program = parseProgram(toTokens('test: Phrase(\\\\)\ntest'));
    expect(program).toBeInstanceOf(Program);
    expect(program.expression).toBeInstanceOf(Block);
    expect(program.expression.statements[0]).toBeInstanceOf(Bind);
    expect(program.expression.statements[1]).toBeInstanceOf(
        UnparsableExpression,
    );
});

// Verify that no matter where we insert a comma, a complex program doesn't crash the parser.
test("commas in complex programs don't crash", { timeout: 120000 }, () => {
    // Get the first 10 example projects
    const projects = readProjects('examples').slice(0, 10);
    // For each one, insert a comma in all possible token gaps and see if the parser crashes.
    for (const project of projects) {
        const code = project.sources[0].code;
        const originalTokens = toTokens(code);
        let i = 0;
        while (i < code.length) {
            let error: Error | undefined = undefined;
            const withComma = code.slice(0, i) + ',' + code.slice(i);
            try {
                parseProgram(toTokens(withComma));
            } catch (e) {
                error = new Error(
                    '' +
                        e +
                        `"${code.slice(i - 20, i)}-->,<--${code.slice(i, i + 20)}" crashed the parser`,
                );
            }
            expect(error).toBeFalsy();

            // No more tokens? Stop.
            if (!originalTokens.hasNext()) break;
            // Skip past the next token, to try a comma after it.
            i += originalTokens.read().getTextLength();
        }
    }
});

test('highlighted example with ⭐', () => {
    const doc = parseDoc(toTokens('¶\\1 + 1\\⭐¶'));
    const example = doc.markup.paragraphs[0].segments[0];
    expect(example).toBeInstanceOf(Example);
    expect((example as Example).highlight).toBeDefined();
    expect((example as Example).highlight?.getText()).toBe('⭐');
});

test('highlighted example with highlight keyword', () => {
    const doc = parseDoc(toTokens('¶\\1 + 1\\highlight¶'));
    const example = doc.markup.paragraphs[0].segments[0];
    expect(example).toBeInstanceOf(Example);
    expect((example as Example).highlight).toBeDefined();
    expect((example as Example).highlight?.getText()).toBe('⭐');
});

test('highlighted example with highlight prefix leaves remainder in stream', () => {
    const doc = parseDoc(toTokens('¶\\1 + 1\\highlight more text¶'));
    const paragraph = doc.markup.paragraphs[0];
    const example = paragraph.segments[0];
    expect(example).toBeInstanceOf(Example);
    expect((example as Example).highlight).toBeDefined();
    expect(paragraph.segments.length).toBeGreaterThan(1);
});

test('non-highlighted example has no highlight', () => {
    const doc = parseDoc(toTokens('¶\\1 + 1\\¶'));
    const example = doc.markup.paragraphs[0].segments[0];
    expect(example).toBeInstanceOf(Example);
    expect((example as Example).highlight).toBeUndefined();
});

test('highlighted example roundtrips to ⭐ form', () => {
    const doc = parseDoc(toTokens('¶\\1 + 1\\highlight¶'));
    const example = doc.markup.paragraphs[0].segments[0] as Example;
    expect(example.toWordplay()).toBe('\\1+1\\⭐');
});

test('unclosed backtick in one doc does not leak into the next doc', () => {
    // A stray `\`` inside a doc must not consume content from the following
    // doc — historically the tokenizer left the Formatted context open across
    // the ¶ boundary, breaking the downstream parse (e.g. createSayType when
    // a machine-translated locale's doc contained an unbalanced backtick).
    const all = tokens('¶stray ` token¶/vi¶normal doc¶/en X•(b•"")');
    const docTokens = all.filter((t) => t.isSymbol(Sym.Doc));
    // Four ¶ symbols total: two opening/closing the first doc, two for the second.
    expect(docTokens.length).toBe(4);
});

test('legitimately nested docs (3 levels deep) still parse', () => {
    // ¶outer \¶middle \¶inner¶\¶\¶ — three levels of doc/code/doc nesting.
    // Each ¶ should be a Doc token, and each \ a Code token; the parse must
    // not get confused by the depth.
    const all = tokens('¶outer \\¶middle \\¶inner¶\\¶\\¶');
    const docTokens = all.filter((t) => t.isSymbol(Sym.Doc));
    const codeTokens = all.filter((t) => t.isSymbol(Sym.Code));
    expect(docTokens.length).toBe(6);
    expect(codeTokens.length).toBe(4);
});

test('unclosed backtick inside a deeply nested doc still closes correctly', () => {
    // ¶outer \¶inner with ` unclosed¶\¶ — the innermost doc has a stray
    // backtick. The middle ¶ must still close the inner doc (popping the
    // unclosed Formatted alongside) so the surrounding code+doc structure
    // unwinds cleanly.
    const all = tokens('¶outer \\¶inner ` unclosed¶\\¶');
    const docTokens = all.filter((t) => t.isSymbol(Sym.Doc));
    const codeTokens = all.filter((t) => t.isSymbol(Sym.Code));
    // Four ¶ open/close the two docs; two \ open/close the one code example.
    expect(docTokens.length).toBe(4);
    expect(codeTokens.length).toBe(2);
});
