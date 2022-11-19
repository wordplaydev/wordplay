import { test, expect } from "vitest";
import Name from "../nodes/Name";
import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanType from "../nodes/BooleanType";
import Borrow from "../nodes/Borrow";
import Doc from "../nodes/Doc";
import FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import NoneType from "../nodes/NoneType";
import { parse, parseBind, parseBlock, parseExpression, parseType, tokens } from "./Parser";
import Program from "../nodes/Program";
import StreamType from "../nodes/StreamType";
import TableType from "../nodes/TableType";
import TextType from "../nodes/TextType";
import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";
import UnionType from "../nodes/UnionType";
import Unparsable from "../nodes/Unparsable";
import TextLiteral from "../nodes/TextLiteral";
import NoneLiteral from "../nodes/NoneLiteral";
import Template from "../nodes/Template";
import BinaryOperation from "../nodes/BinaryOperation";
import ListLiteral from "../nodes/ListLiteral";
import ListAccess from "../nodes/ListAccess";
import SetOrMapAccess from "../nodes/SetOrMapAccess";
import Reaction from "../nodes/Reaction";
import Conditional from "../nodes/Conditional";
import TableLiteral from "../nodes/TableLiteral";
import Select from "../nodes/Select";
import Insert from "../nodes/Insert";
import Update from "../nodes/Update";
import FunctionDefinition from "../nodes/FunctionDefinition";
import Evaluate from "../nodes/Evaluate";
import ConversionDefinition from "../nodes/ConversionDefinition";
import StructureDefinition from "../nodes/StructureDefinition";
import PropertyReference from "../nodes/PropertyReference";
import Reference from "../nodes/Reference";
import BooleanLiteral from "../nodes/BooleanLiteral";
import Convert from "../nodes/Convert";
import Is from "../nodes/Is";
import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import TypePlaceholder from "../nodes/TypePlaceholder";
import Previous from "../nodes/Previous";
import SetLiteral from "../nodes/SetLiteral";
import MapLiteral from "../nodes/MapLiteral";
import SetType from "../nodes/SetType";
import MapType from "../nodes/MapType";
import { NONE_SYMBOL, PLACEHOLDER_SYMBOL } from "./Tokenizer";
import UnparsableType from "../nodes/UnparsableType";

test("Parse programs", () => {

    expect(parse("")).toBeInstanceOf(Program);
    expect(parse("hi")).toBeInstanceOf(Program);

})

test("Parse borrows", () => {

    const good = parse("↓ mouse");
    expect(good.borrows).toHaveLength(1);
    expect(good.borrows[0]).toBeInstanceOf(Borrow);
    expect((good.borrows[0] as Borrow).name?.is(TokenType.NAME)).toBe(true);

})

test("Parse shares", () => {

    const good = parse("↑ fancy: 1");
    expect(good.block).toBeInstanceOf(Block);
    expect((good.block as Block).statements).toHaveLength(1);
    expect((good.block as Block).statements[0]).toBeInstanceOf(Bind)

})

test("Parse block", () => {

    const good = parseBlock(tokens("(\nhi\n)"));
    expect(good).toBeInstanceOf(Block);
    expect((good as Block).statements).toHaveLength(1);
    expect(((good as Block).statements[0])).toBeInstanceOf(Reference);

    const documented = parseBlock(tokens("`Nothing` ( hi )"));
    expect(documented).toBeInstanceOf(Block);
    expect((documented as Block).docs.docs).toHaveLength(1);

    const bad = parse("(\nhi");
    expect(bad.block).toBeInstanceOf(Block);
    expect(((bad.block as Block).statements[0] as Block).statements).toHaveLength(1);
    expect(((bad.block as Block).statements[0] as Block).close).toBeInstanceOf(Unparsable);

})

test("Parse binds", () => {

    const validName = parseBind(tokens("a"));
    expect(validName).toBeInstanceOf(Bind);
    expect((validName as Bind).names.names).toHaveLength(1);
    expect((validName as Bind).names.names[0]).toBeInstanceOf(Name);
    expect((validName as Bind).names.names[0].getName()).toBe("a");
    expect((validName as Bind).names.names[0].lang).toBe(undefined);

    const valuedName = parseBind(tokens("a: 1"));
    expect(valuedName).toBeInstanceOf(Bind);
    expect((valuedName as Bind).names.names).toHaveLength(1);
    expect((valuedName as Bind).names.names[0]).toBeInstanceOf(Name);
    expect((valuedName as Bind).names.names[0].getName()).toBe("a");
    expect((valuedName as Bind).names.names[0].lang).toBe(undefined);
    expect((valuedName as Bind).value).toBeInstanceOf(MeasurementLiteral);

    const typedValuedName = parseBind(tokens("a•#: 1"));
    expect(typedValuedName).toBeInstanceOf(Bind);
    expect((typedValuedName as Bind).type).toBeInstanceOf(MeasurementType);
    expect((typedValuedName as Bind).value).toBeInstanceOf(MeasurementLiteral);

    const aliasedTypedValuedName = parseBind(tokens("a/eng, b/spa•#: 1"));
    expect(aliasedTypedValuedName).toBeInstanceOf(Bind);
    expect((aliasedTypedValuedName as Bind).names.names).toHaveLength(2);
    expect((aliasedTypedValuedName as Bind).names.names[0]).toBeInstanceOf(Name);
    expect((aliasedTypedValuedName as Bind).names.names[0].getLanguage()).toBe("eng");
    expect((aliasedTypedValuedName as Bind).type).toBeInstanceOf(MeasurementType);
    expect((aliasedTypedValuedName as Bind).value).toBeInstanceOf(MeasurementLiteral);

    const documentedName = parseBind(tokens("`Some letters`/eng a/eng, b/spa: 1"));
    expect(documentedName).toBeInstanceOf(Bind);
    expect((documentedName as Bind).docs.docs).toHaveLength(1);
    expect((documentedName as Bind).docs.docs[0]).toBeInstanceOf(Doc);
    expect((documentedName as Bind).docs.docs[0].getLanguage()).toBe("eng");

    const missingName = parseBind(tokens(": 1"));
    expect(missingName).toBeInstanceOf(Unparsable);

    const invalidName = parseBind(tokens("1•#: 1"));
    expect(invalidName).toBeInstanceOf(Unparsable);

})

test("Parse expressions", () => {

    const placeholder = parseExpression(tokens(PLACEHOLDER_SYMBOL));
    expect(placeholder).toBeInstanceOf(ExpressionPlaceholder);

    const none = parseExpression(tokens(NONE_SYMBOL));
    expect(none).toBeInstanceOf(NoneLiteral);

    const name = parseExpression(tokens("boomy"));
    expect(name).toBeInstanceOf(Reference);

    const bool = parseExpression(tokens("⊤"));
    expect(bool).toBeInstanceOf(BooleanLiteral);
    expect((bool as BooleanLiteral).value.is(TokenType.BOOLEAN)).toBe(true);

    const sec = parseExpression(tokens("1s"));
    expect(sec).toBeInstanceOf(MeasurementLiteral);
    expect((sec as MeasurementLiteral).unit?.toWordplay()).toBe("s");

    const speed = parseExpression(tokens("1m/s"));
    expect(speed).toBeInstanceOf(MeasurementLiteral);
    expect((speed as MeasurementLiteral).unit?.toWordplay()).toBe("m/s");

    const denom = parseExpression(tokens("1/s"));
    expect(denom).toBeInstanceOf(MeasurementLiteral);
    expect((denom as MeasurementLiteral).unit?.toWordplay()).toBe("/s");

    const text = parseExpression(tokens("«hola»"));
    expect(text).toBeInstanceOf(TextLiteral);

    const template = parseExpression(tokens('"My cat\'s name is \\name + name\\, what\'s yours?"'));
    expect(template).toBeInstanceOf(Template);
    expect((template as Template).expressions).toHaveLength(2);
    expect((template as Template).expressions[0]).toBeInstanceOf(BinaryOperation);
    expect((template as Template).expressions[1]).toBeInstanceOf(Token);

    const format = parseExpression(tokens("«hola»/spa"));
    expect(format).toBeInstanceOf(TextLiteral);
    expect((format as TextLiteral).format?.getLanguage()).toBe("spa");

    const list = parseExpression(tokens("[1 2 3]"));
    expect(list).toBeInstanceOf(ListLiteral);
    expect((list as ListLiteral).values).toHaveLength(3);

    const listAccess = parseExpression(tokens("list[2]"));
    expect(listAccess).toBeInstanceOf(ListAccess);

    const nestedListAccess = parseExpression(tokens("list[2][3]"));
    expect(nestedListAccess).toBeInstanceOf(ListAccess);
    expect((nestedListAccess as ListAccess).list).toBeInstanceOf(ListAccess);

    const set = parseExpression(tokens("{1 2 3}"));
    expect(set).toBeInstanceOf(SetLiteral);
    expect((set as SetLiteral).values).toHaveLength(3);

    const emptyMap = parseExpression(tokens("{:}"));
    expect(emptyMap).toBeInstanceOf(MapLiteral);
    expect((emptyMap as MapLiteral).values).toHaveLength(0);

    const nonEmptyMap = parseExpression(tokens("{1:1 2:2 3:3}"));
    expect(nonEmptyMap).toBeInstanceOf(MapLiteral);
    expect((nonEmptyMap as MapLiteral).values).toHaveLength(3);

    const setAccess = parseExpression(tokens("set{2}"));
    expect(setAccess).toBeInstanceOf(SetOrMapAccess);

    const nestedSetAccess = parseExpression(tokens("set{2}{3}"));
    expect(nestedSetAccess).toBeInstanceOf(SetOrMapAccess);
    expect((nestedSetAccess as SetOrMapAccess).setOrMap).toBeInstanceOf(SetOrMapAccess);

    const table = parseExpression(tokens("|a•#|b•#|c•#||\n|1|2|3||\n|4|5|6||"));
    expect(table).toBeInstanceOf(TableLiteral);
    expect((table as TableLiteral).columns).toHaveLength(3);
    expect((table as TableLiteral).rows).toHaveLength(2);

    const select = parseExpression(tokens("table |? |a|b|| c > 3"));
    expect(select).toBeInstanceOf(Select);
    expect((select as Select).row.cells).toHaveLength(2);
    expect((select as Select).query).toBeInstanceOf(BinaryOperation);

    const insert = parseExpression(tokens("table|+|1|2|3"));
    expect(insert).toBeInstanceOf(Insert);
    expect((insert as Insert).row.cells).toHaveLength(3);

    const update = parseExpression(tokens("table|:|a:1 b > 5"));
    expect(update).toBeInstanceOf(Update);
    expect((update as Update).row.cells).toHaveLength(1);
    expect((update as Update).query).toBeInstanceOf(BinaryOperation);

    const stream = parseExpression(tokens("0 ∆ clicks a + 1"));
    expect(stream).toBeInstanceOf(Reaction);
    expect((stream as Reaction).next).toBeInstanceOf(BinaryOperation);

    const previous = parseExpression(tokens("a←1"));
    expect(previous).toBeInstanceOf(Previous);
    expect((previous as Previous).index).toBeInstanceOf(MeasurementLiteral);

    const binary = parseExpression(tokens("1 + 2 + 3 + 4"));
    expect(binary).toBeInstanceOf(BinaryOperation);
    expect((binary as BinaryOperation).right).toBeInstanceOf(MeasurementLiteral);
    expect((binary as BinaryOperation).left).toBeInstanceOf(BinaryOperation);
    expect(((binary as BinaryOperation).left as BinaryOperation).left).toBeInstanceOf(BinaryOperation);
    expect((((binary as BinaryOperation).left as BinaryOperation).left as BinaryOperation).left).toBeInstanceOf(MeasurementLiteral);

    const negativeInLists = parseExpression(tokens("[1 -2]"));
    expect((negativeInLists as ListLiteral).values.length).toBe(2);

    const is = parseExpression(tokens("123 • #"));
    expect(is).toBeInstanceOf(Is);

    const conditional = parseExpression(tokens("a ? b c ? d e"));
    expect(conditional).toBeInstanceOf(Conditional);
    expect((conditional as Conditional).condition).toBeInstanceOf(Reference);
    expect((conditional as Conditional).yes).toBeInstanceOf(Reference);
    expect((conditional as Conditional).no).toBeInstanceOf(Conditional);
    expect(((conditional as Conditional).no as Conditional).condition).toBeInstanceOf(Reference);
    expect(((conditional as Conditional).no as Conditional).yes).toBeInstanceOf(Reference);
    expect(((conditional as Conditional).no as Conditional).no).toBeInstanceOf(Reference);

    const abstractFun = parseExpression(tokens("ƒ(a b) …"));
    expect(abstractFun).toBeInstanceOf(FunctionDefinition);
    expect((abstractFun as FunctionDefinition).inputs).toHaveLength(2);

    const noInputs = parseExpression(tokens("ƒ() …"));
    expect(noInputs).toBeInstanceOf(FunctionDefinition);
    expect((noInputs as FunctionDefinition).inputs).toHaveLength(0);

    const withOutputType = parseExpression(tokens("ƒ() •# …"));
    expect(withOutputType).toBeInstanceOf(FunctionDefinition);
    expect((withOutputType as FunctionDefinition).output).toBeInstanceOf(MeasurementType);

    const withBody = parseExpression(tokens("ƒ(a b) •# a + b"));
    expect(withBody).toBeInstanceOf(FunctionDefinition);
    expect((withBody as FunctionDefinition).expression).toBeInstanceOf(BinaryOperation);

    const withDocs = parseExpression(tokens("`Add things`/eng ƒ(a b) a = b"));
    expect(withDocs).toBeInstanceOf(FunctionDefinition);
    expect((withDocs as FunctionDefinition).docs.docs).toHaveLength(1);

    const withMultipleDocs = parseExpression(tokens("`Number one`/eng `Numero uno`/spa ƒ(a b) a = b"));
    expect(withMultipleDocs).toBeInstanceOf(FunctionDefinition);
    expect((withMultipleDocs as FunctionDefinition).docs.docs).toHaveLength(2);

    const withTypeVariables = parseExpression(tokens("ƒ∘T(a: T b: T) a + b"));
    expect(withTypeVariables).toBeInstanceOf(FunctionDefinition);

    const evaluate = parseExpression(tokens("a()"));
    expect(evaluate).toBeInstanceOf(Evaluate);
    expect((evaluate as Evaluate).func).toBeInstanceOf(Reference);

    const evaluateWithUnnamedInputs = parseExpression(tokens("a(1 2)"));
    expect(evaluateWithUnnamedInputs).toBeInstanceOf(Evaluate);
    expect((evaluateWithUnnamedInputs as Evaluate).inputs).toHaveLength(2);

    const evaluateWithNamedInputs = parseExpression(tokens("a(b:2 c:2)"));
    expect(evaluateWithNamedInputs).toBeInstanceOf(Evaluate);
    expect((evaluateWithNamedInputs as Evaluate).inputs).toHaveLength(2);

    const evaluateWithTypeVars = parseExpression(tokens("a∘Cat(b c)"));
    expect(evaluateWithTypeVars).toBeInstanceOf(Evaluate);
    expect((evaluateWithTypeVars as Evaluate).typeInputs).toHaveLength(1);

    const evaluateWithMultipleTypeVars = parseExpression(tokens("a∘Cat∘#(b c)"));
    expect(evaluateWithMultipleTypeVars).toBeInstanceOf(Evaluate);
    expect((evaluateWithMultipleTypeVars as Evaluate).typeInputs).toHaveLength(2);

    const conversion = parseExpression(tokens("# → '' meow()"));
    expect(conversion).toBeInstanceOf(ConversionDefinition);

    const convert = parseExpression(tokens("(1 + 2) → ''"));
    expect(convert).toBeInstanceOf(Convert);

    const conversionWithDocs = parseExpression(tokens("`numtotext`/eng # → '' meow()"));
    expect(conversionWithDocs).toBeInstanceOf(ConversionDefinition);
    expect((conversionWithDocs as ConversionDefinition).docs.docs).toHaveLength(1);

    const structureDef = parseExpression(tokens("•Cat(species•'') ( meow: ƒ() say(species) )"))
    expect(structureDef).toBeInstanceOf(StructureDefinition);
    expect((structureDef as StructureDefinition).inputs).toHaveLength(1);
    expect(((structureDef as StructureDefinition).block as Block).statements).toHaveLength(1);

    const structureDefWithInterface = parseExpression(tokens("•Cat •Mammal(species•'') ( meow: ƒ() say(species) )"))
    expect(structureDefWithInterface).toBeInstanceOf(StructureDefinition);
    expect((structureDefWithInterface as StructureDefinition).interfaces).toHaveLength(1);

    const structureDefWithTypeVariables = parseExpression(tokens("•Cat∘Breed/eng,🐈/😀(species•'') ( meow: ƒ() say(species) )"))
    expect(structureDefWithTypeVariables).toBeInstanceOf(StructureDefinition);
    expect((structureDefWithTypeVariables as StructureDefinition).typeVars).toHaveLength(1);

    const structureDefWithInterfaceAndTypeVariables = parseExpression(tokens("•Cat •Mammal ∘S(species•'') ( meow: ƒ() say(species) )"))
    expect(structureDefWithInterfaceAndTypeVariables).toBeInstanceOf(StructureDefinition);
    expect((structureDefWithInterfaceAndTypeVariables as StructureDefinition).interfaces).toHaveLength(1);
    expect((structureDefWithInterfaceAndTypeVariables as StructureDefinition).typeVars).toHaveLength(1);

    const access = parseExpression(tokens("a.b.c()[d]{f}"));
    expect(access).toBeInstanceOf(SetOrMapAccess);
    expect((access as SetOrMapAccess).setOrMap).toBeInstanceOf(ListAccess);
    expect(((access as SetOrMapAccess).setOrMap as ListAccess).list).toBeInstanceOf(Evaluate);
    expect((((access as SetOrMapAccess).setOrMap as ListAccess).list as Evaluate).func).toBeInstanceOf(PropertyReference);
    expect(((((access as SetOrMapAccess).setOrMap as ListAccess).list as Evaluate).func as PropertyReference).structure).toBeInstanceOf(PropertyReference);
    expect((((((access as SetOrMapAccess).setOrMap as ListAccess).list as Evaluate).func as PropertyReference).structure as PropertyReference).structure).toBeInstanceOf(Reference);

})

test("Blocks and binds", () => {

    const map = parseBlock(tokens("{1:1 2:2 3:3}"), true);
    expect(map).toBeInstanceOf(Block);
    expect((map as Block).statements[0]).toBeInstanceOf(MapLiteral);

    const bindMap = parseBlock(tokens("map: {1:1 2:2 3:3}"), true);
    expect(bindMap).toBeInstanceOf(Block);
    expect((bindMap as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindMap as Block).statements[0] as Bind).value).toBeInstanceOf(MapLiteral);

    const table = parseBlock(tokens("|a•#|b•#\n|1|2"), true);
    expect(table).toBeInstanceOf(Block);
    expect((table as Block).statements[0]).toBeInstanceOf(TableLiteral);

    const bindTable = parseBlock(tokens("table: |a•#|b•#||\n|1|2||"), true);
    expect(bindTable).toBeInstanceOf(Block);
    expect((bindTable as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindTable as Block).statements[0] as Bind).value).toBeInstanceOf(TableLiteral);

    const bindTypedTable = parseBlock(tokens("table•|a•#|b•#||: |a•#|b•#||"), true);
    expect(bindTypedTable).toBeInstanceOf(Block);
    expect((bindTypedTable as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindTypedTable as Block).statements[0] as Bind).type).toBeInstanceOf(TableType);
    expect(((bindTypedTable as Block).statements[0] as Bind).value).toBeInstanceOf(TableLiteral);

});

test("Types", () => {

    const placeholder = parseType(tokens(PLACEHOLDER_SYMBOL));
    expect(placeholder).toBeInstanceOf(TypePlaceholder);

    const name = parseType(tokens("Cat"));
    expect(name).toBeInstanceOf(NameType);

    const bool = parseType(tokens("?"));
    expect(bool).toBeInstanceOf(BooleanType);

    const number = parseType(tokens("#"));
    expect(number).toBeInstanceOf(MeasurementType);

    const specificNumber = parseType(tokens("1"));
    expect(specificNumber).toBeInstanceOf(MeasurementType);

    const text = parseType(tokens("''"));
    expect(text).toBeInstanceOf(TextType);

    const none = parseType(tokens(NONE_SYMBOL));
    expect(none).toBeInstanceOf(NoneType)

    const list = parseType(tokens("[#]"));
    expect(list).toBeInstanceOf(ListType);

    const set = parseType(tokens("{#}"));
    expect(set).toBeInstanceOf(SetType);

    const map = parseType(tokens("{'':#}"));
    expect(map).toBeInstanceOf(MapType);
    expect((map as MapType).value).toBeInstanceOf(MeasurementType);

    const table = parseType(tokens("|#|''|Cat"));
    expect(table).toBeInstanceOf(TableType);

    // Parse function types
    expect(parseType(tokens("ƒ(# #) #"))).toBeInstanceOf(FunctionType);
    expect(parseType(tokens("ƒ(a•# b•#) #"))).toBeInstanceOf(FunctionType);
    expect(parseType(tokens("ƒ(…a•#) #"))).toBeInstanceOf(FunctionType);

    const stream = parseType(tokens("∆#"));
    expect(stream).toBeInstanceOf(StreamType);

    const union = parseType(tokens("Cat•#"))
    expect(union).toBeInstanceOf(UnionType);
    expect((union as UnionType).left).toBeInstanceOf(NameType);
    expect((union as UnionType).right).toBeInstanceOf(MeasurementType);

    const hmm = parseType(tokens("/"))
    expect(hmm).toBeInstanceOf(UnparsableType);

})