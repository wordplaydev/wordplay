import { tokenize } from "./Tokenizer";

test("Tokenize names and whitespace", () => {

    expect(tokenize("hello").map(t => t.toWordplay()).join("\n")).toBe("hello\n");
    expect(tokenize("hello hello").map(t => t.toWordplay()).join("\n")).toBe("hello\n hello\n");
    expect(tokenize("hello\nhello").map(t => t.toWordplay()).join("\n")).toBe("hello\n\nhello\n");
    expect(tokenize("hello  \thello").map(t => t.toWordplay()).join("\n")).toBe("hello\n  \thello\n");
    expect(tokenize("\n   \t").map(t => t.toWordplay()).join("\n")).toBe("\n   \t");

})

test("Tokenize numbers", () => {

    expect(tokenize("1").map(t => t.toWordplay()).join("\n")).toBe("1\n");
    expect(tokenize("-1").map(t => t.toWordplay()).join("\n")).toBe("-\n1\n");
    expect(tokenize("1.0").map(t => t.toWordplay()).join("\n")).toBe("1.0\n");
    expect(tokenize("-1.0").map(t => t.toWordplay()).join("\n")).toBe("-\n1.0\n");
    expect(tokenize("1,0").map(t => t.toWordplay()).join("\n")).toBe("1,0\n");
    expect(tokenize("-1,0").map(t => t.toWordplay()).join("\n")).toBe("-\n1,0\n");
    expect(tokenize("0∞π").map(t => t.toWordplay()).join("\n")).toBe("0\n∞\nπ\n");
    expect(tokenize("一 十 百 百一 百四十五 百九十九 千一 万十一 万").map(t => t.toWordplay()).join("\n")).toBe("一\n 十\n 百\n 百一\n 百四十五\n 百九十九\n 千一\n 万十一\n 万\n");

})

test("Tokenize punctuation", () => {

    expect(tokenize("()[]{}:.;ƒf↑↓``!•∆…").map(t => t.toWordplay()).join("\n"))
        .toBe("(\n)\n[\n]\n{\n}\n:\n.\n;\nƒ\nf\n↑\n↓\n``\n!\n•\n∆\n…\n");
    expect(tokenize("⊥⊤?¿+-×*·÷/^√%boomy=≠<>≤≥||?|+|-|:∧∨¬").map(t => t.toWordplay()).join("\n"))
        .toBe("⊥\n⊤\n?\n¿\n+\n-\n×\n*\n·\n÷\n/\n^\n√\n%\nboomy\n=\n≠\n<\n>\n≤\n≥\n|\n|?\n|+\n|-\n|:\n∧\n∨\n¬\n");

})

test("Tokenize text", () => {

    expect(tokenize("'hi'\"hi\"‘hi’«hi»‹hi›„hi“「hi」").map(t => t.toWordplay()).join("\n"))
        .toBe("'hi'\n\"hi\"\n‘hi’\n«hi»\n‹hi›\n„hi“\n「hi」\n");
    expect(tokenize("'hello \\1 + 2\\ number 3'").map(t => t.toWordplay()).join("\n"))
        .toBe("'hello \\\n1\n +\n 2\n\\ number 3'\n")
    expect(tokenize("'hello'eng\n'hola'spa").map(t => t.toWordplay()).join("\n"))
        .toBe("'hello'\neng\n\n'hola'\nspa\n")

})

test("Escapes", () => {

    expect(tokenize('"Hello \\name\\, how are you?"').map(t => t.toWordplay()).join("\n"))
        .toBe('"Hello \\\nname\n\\, how are you?"\n');
    expect(tokenize("'Hello \\name\\, how are you?'").map(t => t.toWordplay()).join("\n"))
        .toBe("'Hello \\\nname\n\\, how are you?'\n");
    expect(tokenize('“Hello \\name\\, how are you?”').map(t => t.toWordplay()).join("\n"))
        .toBe('“Hello \\\nname\n\\, how are you?”\n');
    expect(tokenize('‘Hello \\name\\, how are you?’').map(t => t.toWordplay()).join("\n"))
        .toBe('‘Hello \\\nname\n\\, how are you?’\n');
    expect(tokenize('«Hello \\name\\, how are you?»').map(t => t.toWordplay()).join("\n"))
        .toBe('«Hello \\\nname\n\\, how are you?»\n');
    expect(tokenize('‹Hello \\name\\, how are you?›').map(t => t.toWordplay()).join("\n"))
        .toBe('‹Hello \\\nname\n\\, how are you?›\n');
    expect(tokenize('「Hello \\name\\, how are you?」').map(t => t.toWordplay()).join("\n"))
        .toBe('「Hello \\\nname\n\\, how are you?」\n');
    expect(tokenize('『Hello \\name\\, how are you?』').map(t => t.toWordplay()).join("\n"))
        .toBe('『Hello \\\nname\n\\, how are you?』\n');

})

test("Tokenize betweens", () => {

    expect(tokenize("'I am \\between\\ us'").map(t => t.toWordplay()).join("\n")).toBe("'I am \\\nbetween\n\\ us'\n");
    expect(tokenize("\"hi \\'hello'\\ and \\'hey'\\\"").map(t => t.toWordplay()).join("\n")).toBe("\"hi \\\n'hello'\n\\ and \\\n'hey'\n\\\"\n");

})
