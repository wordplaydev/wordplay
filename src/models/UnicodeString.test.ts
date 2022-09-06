import UnicodeString from "./UnicodeString";

test("Insert and remove.", () => {

    const s = new UnicodeString("happy");
    expect(s.withGraphemeAt("!", 5)?.toString()).toBe("happy!");
    expect(s.withGraphemeAt("s", 0)?.toString()).toBe("shappy");
    expect(s.withoutGraphemeAt(0)?.toString()).toBe("appy");

    const e = new UnicodeString("");
    expect(e.withGraphemeAt("!", 5)).toBe(undefined);
    expect(e.withoutGraphemeAt(0)).toBe(undefined);

});