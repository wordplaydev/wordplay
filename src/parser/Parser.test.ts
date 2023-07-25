import { test, expect } from 'vitest';
import Name from '@nodes/Name';
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
import {
    toProgram,
    parseBind,
    parseBlock,
    parseExpression,
    parseType,
    toTokens,
    parseDoc,
} from './Parser';
import Program from '@nodes/Program';
import StreamType from '@nodes/StreamType';
import TableType from '@nodes/TableType';
import TextType from '@nodes/TextType';
import Token from '@nodes/Token';
import Symbol from '@nodes/Symbol';
import UnionType from '@nodes/UnionType';
import TextLiteral from '@nodes/TextLiteral';
import NoneLiteral from '@nodes/NoneLiteral';
import Template from '@nodes/Template';
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
import { NONE_SYMBOL, PLACEHOLDER_SYMBOL } from './Symbols';
import UnparsableType from '@nodes/UnparsableType';
import DocumentedExpression from '@nodes/DocumentedExpression';
import TypeInputs from '@nodes/TypeInputs';
import Paragraph from '@nodes/Paragraph';
import WebLink from '@nodes/WebLink';
import Example from '../nodes/Example';

test('Parse programs', () => {
    expect(toProgram('')).toBeInstanceOf(Program);
    expect(toProgram('hi')).toBeInstanceOf(Program);
});

test('Parse borrows', () => {
    const good = toProgram('↓ mouse');
    expect(good.borrows).toHaveLength(1);
    expect(good.borrows[0]).toBeInstanceOf(Borrow);
    expect((good.borrows[0] as Borrow).source?.isSymbol(Symbol.Name)).toBe(
        true
    );

    const prop = toProgram('↓ time.clock');
    expect(prop.borrows).toHaveLength(1);
    expect(prop.borrows[0]).toBeInstanceOf(Borrow);
    expect((prop.borrows[0] as Borrow).name?.isSymbol(Symbol.Name)).toBe(true);
});

test('Parse shares', () => {
    const good = toProgram('↑ fancy: 1');
    expect(good.expression).toBeInstanceOf(Block);
    expect((good.expression as Block).statements).toHaveLength(1);
    expect((good.expression as Block).statements[0]).toBeInstanceOf(Bind);
});

test('Parse block', () => {
    const good = parseBlock(toTokens('(\nhi\n)'));
    expect(good).toBeInstanceOf(Block);
    expect((good as Block).statements).toHaveLength(1);
    expect((good as Block).statements[0]).toBeInstanceOf(Reference);

    const documented = parseBlock(toTokens('`Nothing` ( hi )'));
    expect(documented).toBeInstanceOf(Block);
    expect((documented as Block).docs?.docs).toHaveLength(1);
});

test('Parse binds', () => {
    const validName = parseBind(toTokens('a'));
    expect(validName).toBeInstanceOf(Bind);
    expect((validName as Bind).names.names).toHaveLength(1);
    expect((validName as Bind).names.names[0]).toBeInstanceOf(Name);
    expect((validName as Bind).names.names[0].getName()).toBe('a');
    expect((validName as Bind).names.names[0].language).toBe(undefined);

    const valuedName = parseBind(toTokens('a: 1'));
    expect(valuedName).toBeInstanceOf(Bind);
    expect((valuedName as Bind).names.names).toHaveLength(1);
    expect((valuedName as Bind).names.names[0]).toBeInstanceOf(Name);
    expect((valuedName as Bind).names.names[0].getName()).toBe('a');
    expect((valuedName as Bind).names.names[0].language).toBe(undefined);
    expect((valuedName as Bind).value).toBeInstanceOf(NumberLiteral);

    const typedValuedName = parseBind(toTokens('a•#: 1'));
    expect(typedValuedName).toBeInstanceOf(Bind);
    expect((typedValuedName as Bind).type).toBeInstanceOf(NumberType);
    expect((typedValuedName as Bind).value).toBeInstanceOf(NumberLiteral);

    const aliasedTypedValuedName = parseBind(toTokens('a/en, b/es•#: 1'));
    expect(aliasedTypedValuedName).toBeInstanceOf(Bind);
    expect((aliasedTypedValuedName as Bind).names.names).toHaveLength(2);
    expect((aliasedTypedValuedName as Bind).names.names[0]).toBeInstanceOf(
        Name
    );
    expect((aliasedTypedValuedName as Bind).names.names[0].getLanguage()).toBe(
        'en'
    );
    expect((aliasedTypedValuedName as Bind).type).toBeInstanceOf(NumberType);
    expect((aliasedTypedValuedName as Bind).value).toBeInstanceOf(
        NumberLiteral
    );

    const documentedName = parseBind(
        toTokens('`Some letters`/en a/en, b/es: 1')
    );
    expect(documentedName).toBeInstanceOf(Bind);
    expect((documentedName as Bind).docs?.docs).toHaveLength(1);
    expect((documentedName as Bind).docs?.docs[0]).toBeInstanceOf(Doc);
    expect((documentedName as Bind).docs?.docs[0].getLanguage()).toBe('en');
});

test('Parse expressions', () => {
    const placeholder = parseExpression(toTokens(PLACEHOLDER_SYMBOL));
    expect(placeholder).toBeInstanceOf(ExpressionPlaceholder);

    const none = parseExpression(toTokens(NONE_SYMBOL));
    expect(none).toBeInstanceOf(NoneLiteral);

    const name = parseExpression(toTokens('boomy'));
    expect(name).toBeInstanceOf(Reference);

    const bool = parseExpression(toTokens('⊤'));
    expect(bool).toBeInstanceOf(BooleanLiteral);
    expect((bool as BooleanLiteral).value.isSymbol(Symbol.Boolean)).toBe(true);

    const sec = parseExpression(toTokens('1s'));
    expect(sec).toBeInstanceOf(NumberLiteral);
    expect((sec as NumberLiteral).unit?.toWordplay()).toBe('s');

    const speed = parseExpression(toTokens('1m/s'));
    expect(speed).toBeInstanceOf(NumberLiteral);
    expect((speed as NumberLiteral).unit?.toWordplay()).toBe('m/s');

    const denom = parseExpression(toTokens('1/s'));
    expect(denom).toBeInstanceOf(NumberLiteral);
    expect((denom as NumberLiteral).unit?.toWordplay()).toBe('/s');

    const product = parseExpression(toTokens('1cat^2·dog/s'));
    expect(product).toBeInstanceOf(NumberLiteral);
    expect((product as NumberLiteral).unit?.toWordplay()).toBe('cat^2·dog/s');

    const text = parseExpression(toTokens('«hola»'));
    expect(text).toBeInstanceOf(TextLiteral);

    const escapedText = parseExpression(toTokens('"hello ^"'));
    expect(escapedText).toBeInstanceOf(TextLiteral);

    const template = parseExpression(
        toTokens('"My cat\'s name is \\name + name\\, what\'s yours?"')
    );
    expect(template).toBeInstanceOf(Template);
    expect((template as Template).expressions).toHaveLength(2);
    expect((template as Template).expressions[0]).toBeInstanceOf(
        BinaryEvaluate
    );
    expect((template as Template).expressions[1]).toBeInstanceOf(Token);

    const format = parseExpression(toTokens('«hola»/spa'));
    expect(format).toBeInstanceOf(TextLiteral);
    expect((format as TextLiteral).language?.getLanguage()).toBe('spa');

    const list = parseExpression(toTokens('[1 2 3]'));
    expect(list).toBeInstanceOf(ListLiteral);
    expect((list as ListLiteral).values).toHaveLength(3);

    const listAccess = parseExpression(toTokens('list[2]'));
    expect(listAccess).toBeInstanceOf(ListAccess);

    const nestedListAccess = parseExpression(toTokens('list[2][3]'));
    expect(nestedListAccess).toBeInstanceOf(ListAccess);
    expect((nestedListAccess as ListAccess).list).toBeInstanceOf(ListAccess);

    const set = parseExpression(toTokens('{1 2 3}'));
    expect(set).toBeInstanceOf(SetLiteral);
    expect((set as SetLiteral).values).toHaveLength(3);

    const emptyMap = parseExpression(toTokens('{:}'));
    expect(emptyMap).toBeInstanceOf(MapLiteral);
    expect((emptyMap as MapLiteral).values).toHaveLength(0);

    const nonEmptyMap = parseExpression(toTokens('{1:1 2:2 3:3}'));
    expect(nonEmptyMap).toBeInstanceOf(MapLiteral);
    expect((nonEmptyMap as MapLiteral).values).toHaveLength(3);

    const setAccess = parseExpression(toTokens('set{2}'));
    expect(setAccess).toBeInstanceOf(SetOrMapAccess);

    const nestedSetAccess = parseExpression(toTokens('set{2}{3}'));
    expect(nestedSetAccess).toBeInstanceOf(SetOrMapAccess);
    expect((nestedSetAccess as SetOrMapAccess).setOrMap).toBeInstanceOf(
        SetOrMapAccess
    );

    const table = parseExpression(toTokens('⎡a•# b•# c•#⎦\n⎡1 2 3⎦\n⎡4 5 6⎦'));
    expect(table).toBeInstanceOf(TableLiteral);
    expect((table as TableLiteral).type.columns).toHaveLength(3);
    expect((table as TableLiteral).rows).toHaveLength(2);

    const select = parseExpression(toTokens('table ⎡? ⎡a b⎦ c > 3'));
    expect(select).toBeInstanceOf(Select);
    expect((select as Select).row.cells).toHaveLength(2);
    expect((select as Select).query).toBeInstanceOf(BinaryEvaluate);

    const insert = parseExpression(toTokens('table ⎡+ ⎡1 2 3⎦'));
    expect(insert).toBeInstanceOf(Insert);
    expect((insert as Insert).row.cells).toHaveLength(3);

    const update = parseExpression(toTokens('table ⎡: ⎡a:1⎦ b > 5'));
    expect(update).toBeInstanceOf(Update);
    expect((update as Update).row.cells).toHaveLength(1);
    expect((update as Update).query).toBeInstanceOf(BinaryEvaluate);

    const stream = parseExpression(toTokens('0 … Button() … a + 1'));
    expect(stream).toBeInstanceOf(Reaction);
    expect((stream as Reaction).next).toBeInstanceOf(BinaryEvaluate);

    const previous = parseExpression(toTokens('a←1'));
    expect(previous).toBeInstanceOf(Previous);
    expect((previous as Previous).index).toBeInstanceOf(NumberLiteral);

    const binary = parseExpression(toTokens('1 + 2 + 3 + 4'));
    expect(binary).toBeInstanceOf(BinaryEvaluate);
    expect((binary as BinaryEvaluate).right).toBeInstanceOf(NumberLiteral);
    expect((binary as BinaryEvaluate).left).toBeInstanceOf(BinaryEvaluate);
    expect(
        ((binary as BinaryEvaluate).left as BinaryEvaluate).left
    ).toBeInstanceOf(BinaryEvaluate);
    expect(
        (
            ((binary as BinaryEvaluate).left as BinaryEvaluate)
                .left as BinaryEvaluate
        ).left
    ).toBeInstanceOf(NumberLiteral);

    const negativeInLists = parseExpression(toTokens('[1 -2]'));
    expect((negativeInLists as ListLiteral).values.length).toBe(2);

    const is = parseExpression(toTokens('123 • #'));
    expect(is).toBeInstanceOf(Is);

    const conditional = parseExpression(toTokens('a ? b c ? d e'));
    expect(conditional).toBeInstanceOf(Conditional);
    expect((conditional as Conditional).condition).toBeInstanceOf(Reference);
    expect((conditional as Conditional).yes).toBeInstanceOf(Reference);
    expect((conditional as Conditional).no).toBeInstanceOf(Conditional);
    expect(
        ((conditional as Conditional).no as Conditional).condition
    ).toBeInstanceOf(Reference);
    expect(((conditional as Conditional).no as Conditional).yes).toBeInstanceOf(
        Reference
    );
    expect(((conditional as Conditional).no as Conditional).no).toBeInstanceOf(
        Reference
    );

    const abstractFun = parseExpression(toTokens('ƒ(a b) _'));
    expect(abstractFun).toBeInstanceOf(FunctionDefinition);
    expect((abstractFun as FunctionDefinition).inputs).toHaveLength(2);

    const noInputs = parseExpression(toTokens('ƒ() _'));
    expect(noInputs).toBeInstanceOf(FunctionDefinition);
    expect((noInputs as FunctionDefinition).inputs).toHaveLength(0);

    const withOutputType = parseExpression(toTokens('ƒ() •# _'));
    expect(withOutputType).toBeInstanceOf(FunctionDefinition);
    expect((withOutputType as FunctionDefinition).output).toBeInstanceOf(
        NumberType
    );

    const withBody = parseExpression(toTokens('ƒ(a b) •# a + b'));
    expect(withBody).toBeInstanceOf(FunctionDefinition);
    expect((withBody as FunctionDefinition).expression).toBeInstanceOf(
        BinaryEvaluate
    );

    const withDocs = parseExpression(toTokens('`Add things`/en ƒ(a b) a = b'));
    expect(withDocs).toBeInstanceOf(FunctionDefinition);
    expect((withDocs as FunctionDefinition).docs?.docs).toHaveLength(1);

    const withMultipleDocs = parseExpression(
        toTokens('`Number one`/en `Numero uno`/es ƒ(a b) a = b')
    );
    expect(withMultipleDocs).toBeInstanceOf(FunctionDefinition);
    expect((withMultipleDocs as FunctionDefinition).docs?.docs).toHaveLength(2);

    const withTypeVariables = parseExpression(
        toTokens('ƒ⸨T⸩(a: T b: T) a + b')
    );
    expect(withTypeVariables).toBeInstanceOf(FunctionDefinition);

    const evaluate = parseExpression(toTokens('a()'));
    expect(evaluate).toBeInstanceOf(Evaluate);
    expect((evaluate as Evaluate).fun).toBeInstanceOf(Reference);

    const evaluateWithUnnamedInputs = parseExpression(toTokens('a(1 2)'));
    expect(evaluateWithUnnamedInputs).toBeInstanceOf(Evaluate);
    expect((evaluateWithUnnamedInputs as Evaluate).inputs).toHaveLength(2);

    const evaluateWithNamedInputs = parseExpression(toTokens('a(b:2 c:2)'));
    expect(evaluateWithNamedInputs).toBeInstanceOf(Evaluate);
    expect((evaluateWithNamedInputs as Evaluate).inputs).toHaveLength(2);

    const evaluateWithTypeVars = parseExpression(toTokens('a⸨Cat⸩(b c)'));
    expect(evaluateWithTypeVars).toBeInstanceOf(Evaluate);
    expect((evaluateWithTypeVars as Evaluate).types).toBeInstanceOf(TypeInputs);
    expect(
        ((evaluateWithTypeVars as Evaluate).types as TypeInputs).types
    ).toHaveLength(1);

    const evaluateWithMultipleTypeVars = parseExpression(
        toTokens('a⸨Cat #⸩(b c)')
    );
    expect(evaluateWithMultipleTypeVars).toBeInstanceOf(Evaluate);
    expect((evaluateWithMultipleTypeVars as Evaluate).types).toBeInstanceOf(
        TypeInputs
    );
    expect(
        ((evaluateWithMultipleTypeVars as Evaluate).types as TypeInputs).types
    ).toHaveLength(2);

    const conversion = parseExpression(toTokens("→ # '' meow()"));
    expect(conversion).toBeInstanceOf(ConversionDefinition);

    const convert = parseExpression(toTokens("(1 + 2) → ''"));
    expect(convert).toBeInstanceOf(Convert);

    const conversionWithDocs = parseExpression(
        toTokens("`numtotext`/en → # '' meow()")
    );
    expect(conversionWithDocs).toBeInstanceOf(ConversionDefinition);
    expect(
        (conversionWithDocs as ConversionDefinition).docs?.docs
    ).toHaveLength(1);

    const structureDef = parseExpression(
        toTokens("•Cat(species•'') ( meow: ƒ() say(species) )")
    );
    expect(structureDef).toBeInstanceOf(StructureDefinition);
    expect((structureDef as StructureDefinition).inputs).toHaveLength(1);
    expect(
        ((structureDef as StructureDefinition).expression as Block).statements
    ).toHaveLength(1);

    const structureDefWithInterface = parseExpression(
        toTokens("•Cat Mammal(species•'') ( meow: ƒ() say(species) )")
    );
    expect(structureDefWithInterface).toBeInstanceOf(StructureDefinition);
    expect(
        (structureDefWithInterface as StructureDefinition).interfaces
    ).toHaveLength(1);

    const structureDefWithTypeVariables = parseExpression(
        toTokens("•Cat,🐈/😀⸨Breed⸩(species•'') ( meow: ƒ() say(species) )")
    );
    expect(structureDefWithTypeVariables).toBeInstanceOf(StructureDefinition);
    expect(
        (structureDefWithTypeVariables as StructureDefinition).types?.variables
    ).toHaveLength(1);

    const structureDefWithInterfaceAndTypeVariables = parseExpression(
        toTokens("•Cat Mammal⸨S⸩(species•'') ( meow: ƒ() say(species) )")
    );
    expect(structureDefWithInterfaceAndTypeVariables).toBeInstanceOf(
        StructureDefinition
    );
    expect(
        (structureDefWithInterfaceAndTypeVariables as StructureDefinition)
            .interfaces
    ).toHaveLength(1);
    expect(
        (structureDefWithInterfaceAndTypeVariables as StructureDefinition).types
            ?.variables
    ).toHaveLength(1);

    const access = parseExpression(toTokens('a.b.c()[d]{f}'));
    expect(access).toBeInstanceOf(SetOrMapAccess);
    expect((access as SetOrMapAccess).setOrMap).toBeInstanceOf(ListAccess);
    expect(
        ((access as SetOrMapAccess).setOrMap as ListAccess).list
    ).toBeInstanceOf(Evaluate);
    expect(
        (((access as SetOrMapAccess).setOrMap as ListAccess).list as Evaluate)
            .fun
    ).toBeInstanceOf(PropertyReference);
    expect(
        (
            (
                ((access as SetOrMapAccess).setOrMap as ListAccess)
                    .list as Evaluate
            ).fun as PropertyReference
        ).structure
    ).toBeInstanceOf(PropertyReference);
    expect(
        (
            (
                (
                    ((access as SetOrMapAccess).setOrMap as ListAccess)
                        .list as Evaluate
                ).fun as PropertyReference
            ).structure as PropertyReference
        ).structure
    ).toBeInstanceOf(Reference);

    const documentedExpression = parseExpression(
        toTokens("`let's see it`/en a")
    );
    expect(documentedExpression).toBeInstanceOf(DocumentedExpression);
});

test('Blocks and binds', () => {
    const map = parseBlock(toTokens('{1:1 2:2 3:3}'));
    expect(map).toBeInstanceOf(Block);
    expect((map as Block).statements[0]).toBeInstanceOf(MapLiteral);

    const bindMap = parseBlock(toTokens('map: {1:1 2:2 3:3}'));
    expect(bindMap).toBeInstanceOf(Block);
    expect((bindMap as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindMap as Block).statements[0] as Bind).value).toBeInstanceOf(
        MapLiteral
    );

    const table = parseBlock(toTokens('⎡a•# b•#⎦\n⎡1 2⎦'));
    expect(table).toBeInstanceOf(Block);
    expect((table as Block).statements[0]).toBeInstanceOf(TableLiteral);

    const bindTable = parseBlock(toTokens('table: ⎡a•# b•#⎦\n⎡1 2⎦'));
    expect(bindTable).toBeInstanceOf(Block);
    expect((bindTable as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindTable as Block).statements[0] as Bind).value).toBeInstanceOf(
        TableLiteral
    );

    const bindTypedTable = parseBlock(toTokens('table•⎡a•# b•#⎦: ⎡a•# b•#⎦'));
    expect(bindTypedTable).toBeInstanceOf(Block);
    expect((bindTypedTable as Block).statements[0]).toBeInstanceOf(Bind);
    expect(
        ((bindTypedTable as Block).statements[0] as Bind).type
    ).toBeInstanceOf(TableType);
    expect(
        ((bindTypedTable as Block).statements[0] as Bind).value
    ).toBeInstanceOf(TableLiteral);
});

test('Types', () => {
    const placeholder = parseType(toTokens(PLACEHOLDER_SYMBOL));
    expect(placeholder).toBeInstanceOf(TypePlaceholder);

    const name = parseType(toTokens('Cat'));
    expect(name).toBeInstanceOf(NameType);

    const bool = parseType(toTokens('?'));
    expect(bool).toBeInstanceOf(BooleanType);

    const number = parseType(toTokens('#'));
    expect(number).toBeInstanceOf(NumberType);

    const specificNumber = parseType(toTokens('1'));
    expect(specificNumber).toBeInstanceOf(NumberType);

    const text = parseType(toTokens("''"));
    expect(text).toBeInstanceOf(TextType);

    const none = parseType(toTokens(NONE_SYMBOL));
    expect(none).toBeInstanceOf(NoneType);

    const list = parseType(toTokens('[#]'));
    expect(list).toBeInstanceOf(ListType);

    const set = parseType(toTokens('{#}'));
    expect(set).toBeInstanceOf(SetType);

    const map = parseType(toTokens("{'':#}"));
    expect(map).toBeInstanceOf(MapType);
    expect((map as MapType).value).toBeInstanceOf(NumberType);

    const table = parseType(toTokens("⎡# '' Cat⎦"));
    expect(table).toBeInstanceOf(TableType);

    // Parse function types
    expect(parseType(toTokens('ƒ(# #) #'))).toBeInstanceOf(FunctionType);
    expect(parseType(toTokens('ƒ(a•# b•#) #'))).toBeInstanceOf(FunctionType);
    expect(parseType(toTokens('ƒ(…a•#) #'))).toBeInstanceOf(FunctionType);
    expect(parseType(toTokens('ƒ⸨Species⸩(…a•#) #'))).toBeInstanceOf(
        FunctionType
    );
    expect(parseType(toTokens('ƒ⸨Species Category⸩(…a•#) #'))).toBeInstanceOf(
        FunctionType
    );

    const stream = parseType(toTokens('…#'));
    expect(stream).toBeInstanceOf(StreamType);

    const union = parseType(toTokens('Cat|#'));
    expect(union).toBeInstanceOf(UnionType);
    expect((union as UnionType).left).toBeInstanceOf(NameType);
    expect((union as UnionType).right).toBeInstanceOf(NumberType);

    const hmm = parseType(toTokens('/'));
    expect(hmm).toBeInstanceOf(UnparsableType);
});

test('plain docs', () => {
    const doc = parseDoc(toTokens('`this is what I am.`'));
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[0].segments[0]).toBeInstanceOf(Token);
    expect(doc.markup.paragraphs[0].segments.length).toBe(1);
});

test('multi-paragraph docs', () => {
    const doc = parseDoc(
        toTokens('`this is what I am.\n\nthis is another point.`')
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[1]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs.length).toBe(2);
});

test('linked docs', () => {
    const doc = parseDoc(
        toTokens('`go see more at <wikipedia@https://wikipedia.org>.`')
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[0].segments[1]).toBeInstanceOf(WebLink);
    expect(
        (doc.markup.paragraphs[0].segments[1] as WebLink).url?.getText()
    ).toBe('https://wikipedia.org');
});

test('docs in docs', () => {
    const doc = parseDoc(
        toTokens("`This is a doc: ⧼`my doc`⧽. Don't you see it?`")
    );
    expect(doc).toBeInstanceOf(Doc);
    expect(doc.markup.paragraphs[0]).toBeInstanceOf(Paragraph);
    expect(doc.markup.paragraphs[0].segments[0]).toBeInstanceOf(Token);
    expect(doc.markup.paragraphs[0].segments[1]).toBeInstanceOf(Example);
    expect(doc.markup.paragraphs[0].segments[2]).toBeInstanceOf(Token);
    expect(doc.markup.paragraphs[0].segments.length).toBe(3);
});
