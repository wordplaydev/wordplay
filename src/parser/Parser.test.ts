/* eslint-disable @typescript-eslint/ban-types */
import { test, expect } from 'vitest';
import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import Borrow from '@nodes/Borrow';
import Doc from '@nodes/Doc';
import FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import NameType from '@nodes/NameType';
import NoneType from '@nodes/NoneType';
import { toProgram } from './parseProgram';
import Program from '@nodes/Program';
import StreamType from '@nodes/StreamType';
import TableType from '@nodes/TableType';
import TextType from '@nodes/TextType';
import Token from '@nodes/Token';
import UnionType from '@nodes/UnionType';
import TextLiteral from '@nodes/TextLiteral';
import NoneLiteral from '@nodes/NoneLiteral';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import ListLiteral from '@nodes/ListLiteral';
import ListAccess from '@nodes/ListAccess';
import SetOrMapAccess from '@nodes/SetOrMapAccess';
import Reaction from '@nodes/Reaction';
import Conditional from '@nodes/Conditional';
import TableLiteral from '@nodes/TableLiteral';
import Select from '@nodes/Select';
import Insert from '@nodes/Insert';
import Update from '@nodes/Update';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Evaluate from '@nodes/Evaluate';
import ConversionDefinition from '@nodes/ConversionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import BooleanLiteral from '@nodes/BooleanLiteral';
import Convert from '@nodes/Convert';
import Is from '@nodes/Is';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import TypePlaceholder from '@nodes/TypePlaceholder';
import Previous from '@nodes/Previous';
import SetLiteral from '@nodes/SetLiteral';
import MapLiteral from '@nodes/MapLiteral';
import SetType from '@nodes/SetType';
import MapType from '@nodes/MapType';
import { NONE_SYMBOL, PLACEHOLDER_SYMBOL, TRUE_SYMBOL } from './Symbols';
import UnparsableType from '@nodes/UnparsableType';
import DocumentedExpression from '@nodes/DocumentedExpression';
import TypeInputs from '@nodes/TypeInputs';
import Paragraph from '@nodes/Paragraph';
import WebLink from '@nodes/WebLink';
import Example from '../nodes/Example';
import FormattedType from '../nodes/FormattedType';
import FormattedLiteral from '../nodes/FormattedLiteral';
import Unit from '../nodes/Unit';
import Translation from '../nodes/Translation';
import Row from '../nodes/Row';
import Names from '../nodes/Names';
import Docs from '../nodes/Docs';
import TypeVariables from '../nodes/TypeVariables';
import FormattedTranslation from '../nodes/FormattedTranslation';
import IsLocale from '../nodes/IsLocale';
import Language from '../nodes/Language';
import Delete from '../nodes/Delete';
import { toTokens } from './toTokens';
import parseDoc from './parseDoc';
import { parseBlock } from './parseExpression';
import Otherwise from '@nodes/Otherwise';
import getPreferredSpaces from './getPreferredSpaces';

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

test.each([
    ['(\nhi\n)', Block],
    ['``Nothing``\n(hi)', Block],
    ['a: 1', Bind, 'value', NumberLiteral, '1'],
    ['a•#: 1', Bind, 'type', NumberType, '#'],
    ['a/en, b/es•#: 1', Bind, 'names', Names],
    ['``program``\n\n``Some letters``/en a/en, b/es: 1', Bind, 'docs', Docs],
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
        '``program``\n\n``Add things``/en\nƒ(a b) a = b',
        FunctionDefinition,
        'docs',
        Docs,
    ],
    [
        '``Program``\n\n``Number one``/en ``Numero uno``/es ƒ(a b) a = b',
        FunctionDefinition,
        'docs',
        Docs,
    ],
    ['ƒ⸨T⸩(a: T b: T) a + b', FunctionDefinition, 'types', TypeVariables],
    ['a()', Evaluate, 'fun', Reference, 'a'],
    ['a(1 2)', Evaluate, 'inputs', Array, 2],
    ['a(b:2 c:2)', Evaluate, 'inputs', Array, Bind],
    ['a⸨Cat⸩(b c)', Evaluate, 'types', TypeInputs],
    ['a⸨Cat #⸩(b c)', Evaluate, 'types', TypeInputs],
    ["→ # '' meow()", ConversionDefinition, 'output', TextType],
    [
        "``Program``\n\n``numtotext``/en → # '' meow()",
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
        "``Program``\n\n``let's see it``/en\na",
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
    const doc = parseDoc(toTokens('``this is what I am.``'));
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[0].segments[0]).toBeInstanceOf(Token);
    expect(doc.markup.paragraphs[0].segments.length).toBe(1);
});

test('multi-paragraph docs', () => {
    const doc = parseDoc(
        toTokens('``this is what I am.\n\nthis is another point.``'),
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[1]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs.length).toBe(2);
});

test('linked docs', () => {
    const doc = parseDoc(
        toTokens('``go see more at <wikipedia@https://wikipedia.org>.``'),
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[0].segments[1]).toBeInstanceOf(WebLink);
    expect(
        (doc.markup.paragraphs[0].segments[1] as WebLink).url?.getText(),
    ).toBe('https://wikipedia.org');
});

test('docs in docs', () => {
    const doc = parseDoc(
        toTokens("``This is a doc: \\``my doc``\\. Don't you see it?``"),
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[0].segments[0]).toBeInstanceOf(Token);
    expect(doc.markup.paragraphs[0].segments[1]).toBeInstanceOf(Example);
    expect(doc.markup.paragraphs[0].segments[2]).toBeInstanceOf(Token);
    expect(doc.markup.paragraphs[0].segments.length).toBe(3);
});
