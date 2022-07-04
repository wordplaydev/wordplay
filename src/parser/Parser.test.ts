import { tokenize} from "./Parser";

describe("Check the tokenizer", () => {
    test("Tokenizer", () => {

        expect(tokenize("hello").map(t => t.toWordplay()).join("\n")).toBe("hello");
        expect(tokenize("hello hello").map(t => t.toWordplay()).join("\n")).toBe("hello\n \nhello");
        expect(tokenize("hello\nhello").map(t => t.toWordplay()).join("\n")).toBe("hello\n\n\nhello");
        expect(tokenize("hello  \thello").map(t => t.toWordplay()).join("\n")).toBe("hello\n  \t\nhello");
        expect(tokenize("1").map(t => t.toWordplay()).join("\n")).toBe("1");
        expect(tokenize("-1").map(t => t.toWordplay()).join("\n")).toBe("-1");
        expect(tokenize("1.0").map(t => t.toWordplay()).join("\n")).toBe("1.0");
        expect(tokenize("-1.0").map(t => t.toWordplay()).join("\n")).toBe("-1.0");
        expect(tokenize("1,0").map(t => t.toWordplay()).join("\n")).toBe("1,0");
        expect(tokenize("-1,0").map(t => t.toWordplay()).join("\n")).toBe("-1,0");
        expect(tokenize("()[]{}:.ƒ↑↓`!•…").map(t => t.toWordplay()).join("\n"))
            .toBe("(\n)\n[\n]\n{\n}\n:\n.\nƒ\n↑\n↓\n`\n!\n•\n…");
        expect(tokenize("🙃🙂+-×÷%<>boomy≤≥&|~").map(t => t.toWordplay()).join("\n"))
            .toBe("🙃\n🙂\n+\n-\n×\n÷\n%\n<\n>\nboomy\n≤\n≥\n&\n|\n~");
        expect(tokenize("\n   \t").map(t => t.toWordplay()).join("\n"))
            .toBe("\n\n   \t");
        expect(tokenize("/eng'hi'\"hi\"‘hi‘«hi»‹hi›„hi“「hi」").map(t => t.toWordplay()).join("\n"))
            .toBe("/eng\n'hi'\n\"hi\"\n‘hi‘\n«hi»\n‹hi›\n„hi“\n「hi」");

    })

})