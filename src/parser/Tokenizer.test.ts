import { test, expect } from 'vitest';
import { tokens } from './Tokenizer';

test('Tokenize names and space', () => {
    expect(
        tokens('hello')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('hello ');
    expect(
        tokens('hello hello')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('hello hello ');
    expect(
        tokens('hello\nhello')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('hello hello ');
    expect(
        tokens('hello  \thello')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('hello hello ');
    expect(
        tokens('\n   \t')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('');
});

test('Tokenize numbers', () => {
    expect(
        tokens('1')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('1 ');
    expect(
        tokens('-1')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('-1 ');
    expect(
        tokens('1.0')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('1.0 ');
    expect(
        tokens('-1.0')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('-1.0 ');
    expect(
        tokens('1,0')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('1,0 ');
    expect(
        tokens('-1,0')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('-1,0 ');
    expect(
        tokens('0.5')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('0.5 ');
    expect(
        tokens('.5')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('.5 ');
    expect(
        tokens('0∞π')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('0 ∞ π ');
    expect(
        tokens('一 十 百 百一 百四十五 百九十九 千一 万十一 万')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('一 十 百 百一 百四十五 百九十九 千一 万十一 万 ');
});

test('Tokenize punctuation', () => {
    expect(
        tokens('()[]{}<>:.,ƒf↑↓``!•∆…')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('( ) [ ] { } < > : . , ƒ f ↑ ↓ ` ` ! • ∆ … ');
    expect(
        tokens('⊥⊤?¿+-×*·÷/^√%boomy=≠<>≤≥⎡?⎡+⎡-⎡:⎦⎡&|~')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe(
        '⊥ ⊤ ? ¿ + - × * · ÷ / ^ √ % boomy = ≠ < > ≤ ≥ ⎡? ⎡+ ⎡- ⎡: ⎦ ⎡ & | ~ '
    );
});

test('Tokenize docs', () => {
    expect(
        tokens('`hello`')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('` hello ` ');
    expect(
        tokens('`hello ⧼1 + 1⧽`')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('` hello  ⧼ 1 + 1 ⧽ ` ');
    expect(
        tokens('`hello @bind`')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('` hello  @bind ` ');
    expect(
        tokens('`hello *hello* **hello** ***hello***`')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('` hello  * hello *   ** hello **   *** hello *** ` ');
    expect(
        tokens('`hello <link@https://amyjko.com>`')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('` hello  < link @ https://amyjko.com > ` ');
});

test('Tokenize text', () => {
    expect(
        tokens('\'hi\'"hi"‘hi’«hi»‹hi›„hi“「hi」')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('\'hi\' "hi" ‘hi’ «hi» ‹hi› „hi“ 「hi」 ');
    // Check newline terminated text
    expect(
        tokens('\'hi "hi ‘hi «hi ‹hi „hi 「hi ')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('\'hi "hi ‘hi «hi ‹hi „hi 「hi ');
    expect(
        tokens("'hello \\1 + 2\\ number 3'")
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe("'hello \\ 1 + 2 \\ number 3' ");
    expect(
        tokens("'hello'eng 'hola'spa")
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe("'hello' eng 'hola' spa ");
});

test('Escapes', () => {
    expect(
        tokens('"Hello \\name\\, how are you?"')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('"Hello \\ name \\, how are you?" ');
    expect(
        tokens("'Hello \\name\\, how are you?'")
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe("'Hello \\ name \\, how are you?' ");
    expect(
        tokens('“Hello \\name\\, how are you?”')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('“Hello \\ name \\, how are you?” ');
    expect(
        tokens('‘Hello \\name\\, how are you?’')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('‘Hello \\ name \\, how are you?’ ');
    expect(
        tokens('«Hello \\name\\, how are you?»')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('«Hello \\ name \\, how are you?» ');
    expect(
        tokens('‹Hello \\name\\, how are you?›')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('‹Hello \\ name \\, how are you?› ');
    expect(
        tokens('「Hello \\name\\, how are you?」')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('「Hello \\ name \\, how are you?」 ');
    expect(
        tokens('『Hello \\name\\, how are you?』')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('『Hello \\ name \\, how are you?』 ');
});

test('Tokenize betweens', () => {
    expect(
        tokens("'I am \\between\\ us'")
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe("'I am \\ between \\ us' ");
    expect(
        tokens("\"hi \\'hello'\\ and \\'hey'\\\"")
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe("\"hi \\ 'hello' \\ and \\ 'hey' \\\" ");
    expect(
        tokens('[\'\\hi\\\' "hello"]')
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe('[ \'\\ hi \\\' "hello" ] ');
    expect(
        tokens("«hello \\name\\, I 'am' Amy»")
            .map((t) => t.toWordplay())
            .join(' ')
    ).toBe("«hello \\ name \\, I 'am' Amy» ");
});
