import Block from "./Block";
import Borrow from "./Borrow";
import { parse } from "./Parser";
import Program from "./Program";
import { Token, TokenType } from "./Token";
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