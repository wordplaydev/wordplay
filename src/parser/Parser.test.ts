import Alias from "./Alias";
import Bind from "./Bind";
import Block from "./Block";
import BooleanType from "./BooleanType";
import Borrow from "./Borrow";
import Docs from "./Docs";
import FunctionType from "./FunctionType";
import ListType from "./ListType";
import Measurement from "./Measurement";
import MeasurementType from "./MeasurementType";
import NameType from "./NameType";
import NoneType from "./NoneType";
import { ErrorMessage, parse, parseBind, parseType, tokens } from "./Parser";
import Program from "./Program";
import SetType from "./SetType";
import Share from "./Share";
import StreamType from "./StreamType";
import TableType from "./TableType";
import TextType from "./TextType";
import { Token, TokenType } from "./Token";
import { tokenize } from "./Tokenizer";
import UnionType from "./UnionType";
import Unparsable from "./Unparsable";

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
    expect((good.block as Block).expressions).toHaveLength(1);
    expect((good.block as Block).expressions[0]).toBeInstanceOf(Share)
    expect(((good.block as Block).expressions[0] as Share).bind).toBeInstanceOf(Bind);

    const bad = parse("↑");
    expect(bad.block).toBeInstanceOf(Block);
    expect((bad.block as Block).expressions).toHaveLength(1);
    expect((bad.block as Block).expressions[0]).toBeInstanceOf(Share)
    expect(((bad.block as Block).expressions[0] as Share).bind).toBeInstanceOf(Unparsable);

})

test("Parse block", () => {

    const good = parse("(\nhi\n)");
    expect(good.block).toBeInstanceOf(Block);
    expect((good.block as Block).expressions).toHaveLength(1);
    expect((good.block as Block).expressions[0]).toBeInstanceOf(Block);
    expect(((good.block as Block).expressions[0] as Block).expressions).toHaveLength(1);
    expect(((good.block as Block).expressions[0] as Block).expressions[0]).toBeInstanceOf(Token);
    expect(((good.block as Block).expressions[0] as Block).expressions[0].toWordplay()).toBe("\nhi");

    const bad = parse("(\nhi");
    expect(bad.block).toBeInstanceOf(Block);
    expect(((bad.block as Block).expressions[0] as Block).expressions).toHaveLength(1);
    expect(((bad.block as Block).expressions[0] as Block).close).toBeInstanceOf(Unparsable);

})

test("Parse binds", () => {

    const validName = parseBind(tokens("a"));
    expect(validName).toBeInstanceOf(Bind);
    expect((validName as Bind).names).toHaveLength(1);
    expect((validName as Bind).names[0]).toBeInstanceOf(Alias);
    expect((validName as Bind).names[0].name.toWordplay()).toBe("a");
    expect((validName as Bind).names[0].lang).toBe(undefined);

    const valuedName = parseBind(tokens("a: 1"));
    expect(valuedName).toBeInstanceOf(Bind);
    expect((valuedName as Bind).names).toHaveLength(1);
    expect((valuedName as Bind).names[0]).toBeInstanceOf(Alias);
    expect((valuedName as Bind).names[0].name.toWordplay()).toBe("a");
    expect((valuedName as Bind).names[0].lang).toBe(undefined);
    expect((valuedName as Bind).value).toBeInstanceOf(Measurement);

    const typedValuedName = parseBind(tokens("a•#: 1"));
    expect(typedValuedName).toBeInstanceOf(Bind);
    expect((typedValuedName as Bind).type).toBeInstanceOf(MeasurementType);
    expect((typedValuedName as Bind).value).toBeInstanceOf(Measurement);

    const aliasedTypedValuedName = parseBind(tokens("a/eng b/span•#: 1"));
    expect(aliasedTypedValuedName).toBeInstanceOf(Bind);
    expect((aliasedTypedValuedName as Bind).names).toHaveLength(2);
    expect((aliasedTypedValuedName as Bind).names[0]).toBeInstanceOf(Alias);
    expect((aliasedTypedValuedName as Bind).names[0].lang?.text).toBe("eng");
    expect((aliasedTypedValuedName as Bind).type).toBeInstanceOf(MeasurementType);
    expect((aliasedTypedValuedName as Bind).value).toBeInstanceOf(Measurement);

    const documentedName = parseBind(tokens("`Some letters`eng a/eng b/span"));
    expect(documentedName).toBeInstanceOf(Bind);
    expect((documentedName as Bind).docs).toHaveLength(1);
    expect((documentedName as Bind).docs[0]).toBeInstanceOf(Docs);
    expect((documentedName as Bind).docs[0].lang?.text).toBe("eng");

    const missingName = parseBind(tokens(": 1"));
    expect(missingName).toBeInstanceOf(Unparsable);

    const invalidName = parseBind(tokens("1•#: 1"));
    expect(invalidName).toBeInstanceOf(Unparsable);

})

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
    expect(set).toBeInstanceOf(SetType);

    const map = parseType(tokens("{'':#}"));
    expect(map).toBeInstanceOf(SetType);
    expect((map as SetType).value).toBeInstanceOf(MeasurementType);

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
    expect((hmm as Unparsable).reason).toBe(ErrorMessage.EXPECTED_TYPE);

})