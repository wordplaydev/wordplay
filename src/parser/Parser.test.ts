import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanType from "../nodes/BooleanType";
import Borrow from "../nodes/Borrow";
import Docs from "../nodes/Docs";
import FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import NoneType from "../nodes/NoneType";
import { SyntacticConflict, parse, parseBind, parseBlock, parseExpression, parseType, tokens } from "./Parser";
import Program from "../nodes/Program";
import SetOrMapType from "../nodes/SetOrMapType";
import Share from "../nodes/Share";
import StreamType from "../nodes/StreamType";
import TableType from "../nodes/TableType";
import TextType from "../nodes/TextType";
import Token, { TokenType } from "../nodes/Token";
import UnionType from "../nodes/UnionType";
import Unparsable from "../nodes/Unparsable";
import TextLiteral from "../nodes/TextLiteral";
import NoneLiteral from "../nodes/NoneLiteral";
import Template from "../nodes/Template";
import BinaryOperation from "../nodes/BinaryOperation";
import ListLiteral from "../nodes/ListLiteral";
import ListAccess from "../nodes/ListAccess";
import SetOrMapLiteral from "../nodes/SetOrMapLiteral";
import SetOrMapAccess from "../nodes/SetOrMapAccess";
import Stream from "../nodes/Stream";
import Conditional from "../nodes/Conditional";
import TableLiteral from "../nodes/TableLiteral";
import Select from "../nodes/Select";
import Insert from "../nodes/Insert";
import Update from "../nodes/Update";
import FunctionDefinition from "../nodes/FunctionDefinition";
import Evaluate from "../nodes/Evaluate";
import Conversion from "../nodes/Conversion";
import CustomType from "../nodes/CustomType";
import AccessName from "../nodes/AccessName";
import Name from "../nodes/Name";
import BooleanLiteral from "../nodes/BooleanLiteral";
import Convert from "../nodes/Convert";

test("Parse programs", () => {

    expect(parse("")).toBeInstanceOf(Program);
    expect(parse("hi")).toBeInstanceOf(Program);

})

test("Parse borrows", () => {

    const good = parse("↓ mouse");
    expect(good.borrows).toHaveLength(1);
    expect(good.borrows[0]).toBeInstanceOf(Borrow);
    expect((good.borrows[0] as Borrow).name.is(TokenType.NAME)).toBe(true);

    const bad = parse("↓");
    expect(bad.borrows).toHaveLength(1);
    expect(bad.borrows[0]).toBeInstanceOf(Unparsable);

})

test("Parse shares", () => {

    const good = parse("↑ fancy");
    expect(good.block).toBeInstanceOf(Block);
    expect((good.block as Block).statements).toHaveLength(1);
    expect((good.block as Block).statements[0]).toBeInstanceOf(Share)
    expect(((good.block as Block).statements[0] as Share).bind).toBeInstanceOf(Bind);

    const bad = parse("↑");
    expect(bad.block).toBeInstanceOf(Block);
    expect((bad.block as Block).statements).toHaveLength(1);
    expect((bad.block as Block).statements[0]).toBeInstanceOf(Share)
    expect(((bad.block as Block).statements[0] as Share).bind).toBeInstanceOf(Unparsable);

})

test("Parse block", () => {

    const good = parseBlock(false, tokens("(\nhi\n)"));
    expect(good).toBeInstanceOf(Block);
    expect((good as Block).statements).toHaveLength(1);
    expect(((good as Block).statements[0])).toBeInstanceOf(Name);

    const documented = parseBlock(false, tokens("`Nothing` ( hi )"));
    expect(documented).toBeInstanceOf(Block);
    expect((documented as Block).docs).toHaveLength(1);

    const bad = parse("(\nhi");
    expect(bad.block).toBeInstanceOf(Block);
    expect(((bad.block as Block).statements[0] as Block).statements).toHaveLength(1);
    expect(((bad.block as Block).statements[0] as Block).close).toBeInstanceOf(Unparsable);

})

test("Parse binds", () => {

    const validName = parseBind(true, tokens("a"));
    expect(validName).toBeInstanceOf(Bind);
    expect((validName as Bind).names).toHaveLength(1);
    expect((validName as Bind).names[0]).toBeInstanceOf(Alias);
    expect((validName as Bind).names[0].name.toWordplay()).toBe("a");
    expect((validName as Bind).names[0].lang).toBe(undefined);

    const valuedName = parseBind(true, tokens("a: 1"));
    expect(valuedName).toBeInstanceOf(Bind);
    expect((valuedName as Bind).names).toHaveLength(1);
    expect((valuedName as Bind).names[0]).toBeInstanceOf(Alias);
    expect((valuedName as Bind).names[0].name.toWordplay()).toBe("a");
    expect((valuedName as Bind).names[0].lang).toBe(undefined);
    expect((valuedName as Bind).value).toBeInstanceOf(MeasurementLiteral);

    const typedValuedName = parseBind(true, tokens("a•#: 1"));
    expect(typedValuedName).toBeInstanceOf(Bind);
    expect((typedValuedName as Bind).type).toBeInstanceOf(MeasurementType);
    expect((typedValuedName as Bind).value).toBeInstanceOf(MeasurementLiteral);

    const aliasedTypedValuedName = parseBind(true, tokens("a/eng, b/span•#: 1"));
    expect(aliasedTypedValuedName).toBeInstanceOf(Bind);
    expect((aliasedTypedValuedName as Bind).names).toHaveLength(2);
    expect((aliasedTypedValuedName as Bind).names[0]).toBeInstanceOf(Alias);
    expect((aliasedTypedValuedName as Bind).names[0].lang?.text).toBe("eng");
    expect((aliasedTypedValuedName as Bind).type).toBeInstanceOf(MeasurementType);
    expect((aliasedTypedValuedName as Bind).value).toBeInstanceOf(MeasurementLiteral);

    const documentedName = parseBind(true, tokens("`Some letters`eng a/eng, b/span"));
    expect(documentedName).toBeInstanceOf(Bind);
    expect((documentedName as Bind).docs).toHaveLength(1);
    expect((documentedName as Bind).docs[0]).toBeInstanceOf(Docs);
    expect((documentedName as Bind).docs[0].lang?.text).toBe("eng");

    const missingName = parseBind(true, tokens(": 1"));
    expect(missingName).toBeInstanceOf(Unparsable);

    const invalidName = parseBind(true, tokens("1•#: 1"));
    expect(invalidName).toBeInstanceOf(Unparsable);

})

test("Parse expressions", () => {

    const none = parseExpression(tokens("!"));
    expect(none).toBeInstanceOf(NoneLiteral);

    const noneRefined = parseExpression(tokens("!zero"));
    expect(noneRefined).toBeInstanceOf(NoneLiteral);
    expect((noneRefined as NoneLiteral).name?.toWordplay()).toBe("zero");

    const name = parseExpression(tokens("boomy"));
    expect(name).toBeInstanceOf(Name);

    const bool = parseExpression(tokens("⊤"));
    expect(bool).toBeInstanceOf(BooleanLiteral);
    expect((bool as BooleanLiteral).value.is(TokenType.BOOLEAN)).toBe(true);

    const number = parseExpression(tokens("1"));
    expect(number).toBeInstanceOf(MeasurementLiteral);
    expect((number as MeasurementLiteral).unit).toBe(undefined);

    const sec = parseExpression(tokens("1s"));
    expect(sec).toBeInstanceOf(MeasurementLiteral);
    expect((sec as MeasurementLiteral).unit?.toWordplay()).toBe("s");

    const speed = parseExpression(tokens("1m/s"));
    expect(speed).toBeInstanceOf(MeasurementLiteral);
    expect((speed as MeasurementLiteral).unit?.toWordplay()).toBe("m/s");

    const badSpeed = parseExpression(tokens("1 m/s"));
    expect(badSpeed).toBeInstanceOf(MeasurementLiteral);
    expect((badSpeed as MeasurementLiteral).unit).toBe(undefined);

    const text = parseExpression(tokens("«hola»"));
    expect(text).toBeInstanceOf(TextLiteral);

    const template = parseExpression(tokens("'My cat\'s name is (name + name), what\'s yours?'"));
    expect(template).toBeInstanceOf(Template);
    expect((template as Template).parts).toHaveLength(3);
    expect((template as Template).parts[0]).toBeInstanceOf(Token);
    expect((template as Template).parts[1]).toBeInstanceOf(BinaryOperation);
    expect((template as Template).parts[2]).toBeInstanceOf(Token);

    const format = parseExpression(tokens("«hola»spa"));
    expect(format).toBeInstanceOf(TextLiteral);
    expect((format as TextLiteral).format?.toWordplay()).toBe("spa");

    const list = parseExpression(tokens("[1 2 3]"));
    expect(list).toBeInstanceOf(ListLiteral);
    expect((list as ListLiteral).values).toHaveLength(3);

    const listAccess = parseExpression(tokens("list[2]"));
    expect(listAccess).toBeInstanceOf(ListAccess);

    const nestedListAccess = parseExpression(tokens("list[2][3]"));
    expect(nestedListAccess).toBeInstanceOf(ListAccess);
    expect((nestedListAccess as ListAccess).list).toBeInstanceOf(ListAccess);

    const set = parseExpression(tokens("{1 2 3}"));
    expect(set).toBeInstanceOf(SetOrMapLiteral);
    expect((set as SetOrMapLiteral).values).toHaveLength(3);

    const setAccess = parseExpression(tokens("set{2}"));
    expect(setAccess).toBeInstanceOf(SetOrMapAccess);

    const nestedSetAccess = parseExpression(tokens("set{2}{3}"));
    expect(nestedSetAccess).toBeInstanceOf(SetOrMapAccess);
    expect((nestedSetAccess as SetOrMapAccess).setOrMap).toBeInstanceOf(SetOrMapAccess);

    const map = parseExpression(tokens("{1:2 3:4 5:6}"));
    expect(map).toBeInstanceOf(SetOrMapLiteral);
    expect((map as SetOrMapLiteral).values).toHaveLength(3);

    const table = parseExpression(tokens("|a•#|b•#|c•#\n|1|2|3\n|4|5|6"));
    expect(table).toBeInstanceOf(TableLiteral);
    expect((table as TableLiteral).columns).toHaveLength(3);
    expect((table as TableLiteral).rows).toHaveLength(2);

    const select = parseExpression(tokens("table|?|a|b c > 3"));
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
    expect(stream).toBeInstanceOf(Stream);
    expect((stream as Stream).next).toBeInstanceOf(BinaryOperation);

    const binary = parseExpression(tokens("1 + 2 + 3 + 4"));
    expect(binary).toBeInstanceOf(BinaryOperation);
    expect((binary as BinaryOperation).left).toBeInstanceOf(MeasurementLiteral);
    expect((binary as BinaryOperation).right).toBeInstanceOf(BinaryOperation);
    expect(((binary as BinaryOperation).right as BinaryOperation).right).toBeInstanceOf(BinaryOperation);
    expect((((binary as BinaryOperation).right as BinaryOperation).right as BinaryOperation).right).toBeInstanceOf(MeasurementLiteral);

    const conditional = parseExpression(tokens("a ? b c ? d e"));
    expect(conditional).toBeInstanceOf(Conditional);
    expect((conditional as Conditional).condition).toBeInstanceOf(Name);
    expect((conditional as Conditional).yes).toBeInstanceOf(Name);
    expect((conditional as Conditional).no).toBeInstanceOf(Conditional);
    expect(((conditional as Conditional).no as Conditional).condition).toBeInstanceOf(Name);
    expect(((conditional as Conditional).no as Conditional).yes).toBeInstanceOf(Name);
    expect(((conditional as Conditional).no as Conditional).no).toBeInstanceOf(Name);

    const abstractFun = parseExpression(tokens("ƒ(a b) …"));
    expect(abstractFun).toBeInstanceOf(FunctionDefinition);
    expect((abstractFun as FunctionDefinition).inputs).toHaveLength(2);

    const noInputs = parseExpression(tokens("ƒ() …"));
    expect(noInputs).toBeInstanceOf(FunctionDefinition);
    expect((noInputs as FunctionDefinition).inputs).toHaveLength(0);

    const withOutputType = parseExpression(tokens("ƒ() •# …"));
    expect(withOutputType).toBeInstanceOf(FunctionDefinition);
    expect((withOutputType as FunctionDefinition).output).toBeInstanceOf(MeasurementType);

    const withBody = parseExpression(tokens("ƒ(a b) •# a+b"));
    expect(withBody).toBeInstanceOf(FunctionDefinition);
    expect((withBody as FunctionDefinition).expression).toBeInstanceOf(BinaryOperation);

    const withDocs = parseExpression(tokens("`Add things`eng ƒ(a b) a = b"));
    expect(withDocs).toBeInstanceOf(FunctionDefinition);
    expect((withDocs as FunctionDefinition).docs).toHaveLength(1);

    const withMultipleDocs = parseExpression(tokens("`Number one`eng `Numero uno`spa ƒ(a b) a = b"));
    expect(withMultipleDocs).toBeInstanceOf(FunctionDefinition);
    expect((withMultipleDocs as FunctionDefinition).docs).toHaveLength(2);

    const withTypeVariables = parseExpression(tokens("ƒ •T (a: T b: T) a + b"));
    expect(withTypeVariables).toBeInstanceOf(FunctionDefinition);

    const evaluate = parseExpression(tokens("a()"));
    expect(evaluate).toBeInstanceOf(Evaluate);
    expect((evaluate as Evaluate).func).toBeInstanceOf(Name);

    const evaluateWithUnnamedInputs = parseExpression(tokens("a(1 2)"));
    expect(evaluateWithUnnamedInputs).toBeInstanceOf(Evaluate);
    expect((evaluateWithUnnamedInputs as Evaluate).inputs).toHaveLength(2);

    const evaluateWithNamedInputs = parseExpression(tokens("a(b:2 c:2)"));
    expect(evaluateWithNamedInputs).toBeInstanceOf(Evaluate);
    expect((evaluateWithNamedInputs as Evaluate).inputs).toHaveLength(2);

    const evaluateWithTypeVars = parseExpression(tokens("a•Cat(b c)"));
    expect(evaluateWithTypeVars).toBeInstanceOf(Evaluate);
    expect((evaluateWithTypeVars as Evaluate).typeVars).toHaveLength(1);

    const conversion = parseExpression(tokens("→ '' meow()"));
    expect(conversion).toBeInstanceOf(Conversion);

    const convert = parseExpression(tokens("(1 + 2) → ''"));
    expect(convert).toBeInstanceOf(Convert);

    const conversionWithDocs = parseExpression(tokens("`To meows`eng → '' meow()"));
    expect(conversionWithDocs).toBeInstanceOf(Conversion);
    expect((conversionWithDocs as Conversion).docs).toHaveLength(1);

    const customType = parseExpression(tokens("•(species•'') ( meow: ƒ() say(species) )"))
    expect(customType).toBeInstanceOf(CustomType);
    expect((customType as CustomType).inputs).toHaveLength(1);
    expect(((customType as CustomType).block as Block).statements).toHaveLength(1);

    const access = parseExpression(tokens("a.b.c()[d]{f}"));
    expect(access).toBeInstanceOf(SetOrMapAccess);
    expect((access as SetOrMapAccess).setOrMap).toBeInstanceOf(ListAccess);
    expect(((access as SetOrMapAccess).setOrMap as ListAccess).list).toBeInstanceOf(Evaluate);
    expect((((access as SetOrMapAccess).setOrMap as ListAccess).list as Evaluate).func).toBeInstanceOf(AccessName);
    expect(((((access as SetOrMapAccess).setOrMap as ListAccess).list as Evaluate).func as AccessName).subject).toBeInstanceOf(AccessName);
    expect((((((access as SetOrMapAccess).setOrMap as ListAccess).list as Evaluate).func as AccessName).subject as AccessName).subject).toBeInstanceOf(Name);

})

test("Blocks and binds", () => {

    const map = parseBlock(true, tokens("{1:1 2:2 3:3}"));
    expect(map).toBeInstanceOf(Block);
    expect((map as Block).statements[0]).toBeInstanceOf(SetOrMapLiteral);

    const bindMap = parseBlock(true, tokens("map: {1:1 2:2 3:3}"));
    expect(bindMap).toBeInstanceOf(Block);
    expect((bindMap as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindMap as Block).statements[0] as Bind).value).toBeInstanceOf(SetOrMapLiteral);

    const table = parseBlock(true, tokens("|a•#|b•#\n|1|2"));
    expect(table).toBeInstanceOf(Block);
    expect((table as Block).statements[0]).toBeInstanceOf(TableLiteral);

    const bindTable = parseBlock(true, tokens("table: |a•#|b•#\n|1|2"));
    expect(bindTable).toBeInstanceOf(Block);
    expect((bindTable as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindTable as Block).statements[0] as Bind).value).toBeInstanceOf(TableLiteral);

    const bindTypedTable = parseBlock(true, tokens("table•|a•#|b•#: |a•#|b•#\n|1|2"));
    expect(bindTypedTable).toBeInstanceOf(Block);
    expect((bindTypedTable as Block).statements[0]).toBeInstanceOf(Bind);
    expect(((bindTypedTable as Block).statements[0] as Bind).type).toBeInstanceOf(TableType);
    expect(((bindTypedTable as Block).statements[0] as Bind).value).toBeInstanceOf(TableLiteral);

});

test("Type variables", () => {

    const name = parseType(tokens("Cat"));
    expect(name).toBeInstanceOf(NameType);

    const bool = parseType(tokens("?"));
    expect(bool).toBeInstanceOf(BooleanType);

    const number = parseType(tokens("#"));
    expect(number).toBeInstanceOf(MeasurementType);

    const text = parseType(tokens("''"));
    expect(text).toBeInstanceOf(TextType);

    const none = parseType(tokens("!"));
    expect(none).toBeInstanceOf(NoneType);

    const noneRefined = parseType(tokens("!zero"));
    expect(noneRefined).toBeInstanceOf(NoneType);
    expect((noneRefined as NoneType).name?.toWordplay()).toBe("zero");

    const list = parseType(tokens("[#]"));
    expect(list).toBeInstanceOf(ListType);

    const set = parseType(tokens("{#}"));
    expect(set).toBeInstanceOf(SetOrMapType);

    const map = parseType(tokens("{'':#}"));
    expect(map).toBeInstanceOf(SetOrMapType);
    expect((map as SetOrMapType).value).toBeInstanceOf(MeasurementType);

    const table = parseType(tokens("|#|''|Cat"));
    expect(table).toBeInstanceOf(TableType);

    const fun = parseType(tokens("ƒ(# #) #"));
    expect(fun).toBeInstanceOf(FunctionType);

    const stream = parseType(tokens("∆#"));
    expect(stream).toBeInstanceOf(StreamType);

    const union = parseType(tokens("Cat ∨ #"))
    expect(union).toBeInstanceOf(UnionType);
    expect((union as UnionType).left).toBeInstanceOf(NameType);
    expect((union as UnionType).right).toBeInstanceOf(MeasurementType);

    const hmm = parseType(tokens("/"))
    expect(hmm).toBeInstanceOf(Unparsable);
    expect((hmm as Unparsable).reason).toBe(SyntacticConflict.EXPECTED_TYPE);

})