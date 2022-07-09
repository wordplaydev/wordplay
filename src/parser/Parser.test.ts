import Alias from "./Alias";
import Bind from "./Bind";
import Block from "./Block";
import Borrow from "./Borrow";
import Docs from "./Docs";
import Measurement from "./Measurement";
import MeasurementType from "./MeasurementType";
import { parse, parseBind, tokens } from "./Parser";
import Program from "./Program";
import Share from "./Share";
import { Token, TokenType } from "./Token";
import { tokenize } from "./Tokenizer";
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