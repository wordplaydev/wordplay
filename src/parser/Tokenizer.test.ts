import { tokenize } from "./Tokenizer";

test("Tokenize names and whitespace", () => {

    expect(tokenize("hello").map(t => t.toWordplay()).join("\n")).toBe("hello");
    expect(tokenize("hello hello").map(t => t.toWordplay()).join("\n")).toBe("hello\n \nhello");
    expect(tokenize("hello\nhello").map(t => t.toWordplay()).join("\n")).toBe("hello\n\n\nhello");
    expect(tokenize("hello  \thello").map(t => t.toWordplay()).join("\n")).toBe("hello\n  \t\nhello");
    expect(tokenize("\n   \t").map(t => t.toWordplay()).join("\n"))
        .toBe("\n\n   \t");

})

test("Tokenize numbers", () => {

    expect(tokenize("1").map(t => t.toWordplay()).join("\n")).toBe("1");
    expect(tokenize("-1").map(t => t.toWordplay()).join("\n")).toBe("-1");
    expect(tokenize("1.0").map(t => t.toWordplay()).join("\n")).toBe("1.0");
    expect(tokenize("-1.0").map(t => t.toWordplay()).join("\n")).toBe("-1.0");
    expect(tokenize("1,0").map(t => t.toWordplay()).join("\n")).toBe("1,0");
    expect(tokenize("-1,0").map(t => t.toWordplay()).join("\n")).toBe("-1,0");

})

test("Tokenize punctuation", () => {

    expect(tokenize("()[]{}:.ƒ↑↓`!•…").map(t => t.toWordplay()).join("\n"))
        .toBe("(\n)\n[\n]\n{\n}\n:\n.\nƒ\n↑\n↓\n`\n!\n•\n…");
    expect(tokenize("⊥⊤+-×÷%<>boomy≤≥&|~").map(t => t.toWordplay()).join("\n"))
        .toBe("⊥\n⊤\n+\n-\n×\n÷\n%\n<\n>\nboomy\n≤\n≥\n&\n|\n~");

})

test("Tokenize text", () => {

    expect(tokenize("/eng'hi'\"hi\"‘hi‘«hi»‹hi›„hi“「hi」").map(t => t.toWordplay()).join("\n"))
        .toBe("/eng\n'hi'\n\"hi\"\n‘hi‘\n«hi»\n‹hi›\n„hi“\n「hi」");
    expect(tokenize("'hello (1 + 2) number 3'").map(t => t.toWordplay()).join("\n"))
        .toBe("'hello (\n1\n \n+\n \n2\n) number 3'")

})