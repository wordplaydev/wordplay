import Block from "./Block";
import Borrow from "./Borrow";
import { parse } from "./Parser";
import Program from "./Program";
import { TokenType } from "./Token";
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