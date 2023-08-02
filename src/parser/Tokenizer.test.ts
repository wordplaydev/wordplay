import { test, expect } from 'vitest';
import { tokens } from './Tokenizer';

test.each([
    ['hello', 'hello|'],
    ['hello hello', 'hello|hello|'],
    ['hello\nhello', 'hello|hello|'],
    ['hello\thello', 'hello|hello|'],
    ['\n    \t', ''],
    ['1', '1|'],
    ['-1', '-1|'],
    ['1.0', '1.0|'],
    ['-1,0', '-1,0|'],
    ['1,0', '1,0|'],
    ['0.5', '0.5|'],
    ['.5', '.5|'],
    ['0∞π', '0|∞|π|'],
    [
        '一 十 百 百一 百四十五 百九十九 千一 万十一 万',
        '一|十|百|百一|百四十五|百九十九|千一|万十一|万|',
    ],
    ['()[]{}<>:.,ƒf↑↓!•∆…```', '(|)|[|]|{|}|<|>|:|.|,|ƒ|f|↑|↓|!|•|∆|…|``|`|'],
    [
        '⊥⊤?¿+-×*·÷/^√%boomy=≠<>≤≥⎡?⎡+⎡-⎡:⎦⎡&|~',
        '⊥|⊤|?|¿|+|-|×|*|·|÷|/|^|√|%|boomy|=|≠|<|>|≤|≥|⎡?|⎡+|⎡-|⎡:|⎦|⎡|&|||~|',
    ],
    ['``hello``', '``|hello|``|'],
    ['``hello \\1 + 1\\``', '``|hello |\\|1|+|1|\\|``|'],
    ['``hello @bind``', '``|hello |@bind|``|'],
    [
        '``hello *hello* /hello/ _hello_``',
        '``|hello |*|hello|*| |/|hello|/| |_|hello|_|``|',
    ],
    [
        '``hello <link@https://amyjko.com>``',
        '``|hello |<|link|@|https://amyjko.com|>|``|',
    ],
    ['``this is $1 [hi|no]``', '``|this is |$1| |[|hi|||no|]|``|'],
    [
        '\'hi\'"hi"‘hi’«hi»‹hi›„hi“「hi」',
        '\'|hi|\'|"|hi|"|‘|hi|’|«|hi|»|‹|hi|›|„|hi|“|「|hi|」|',
    ],
    [
        '\'hi\'"hi"‘hi’«hi»‹hi›„hi“「hi」',
        '\'|hi|\'|"|hi|"|‘|hi|’|«|hi|»|‹|hi|›|„|hi|“|「|hi|」|',
    ],
    [
        '\'hi\n"hi\n‘hi\n«hi\n‹hi\n„hi\n「hi\n',
        '\'|hi|"|hi|‘|hi|«|hi|‹|hi|„|hi|「|hi|',
    ],
    ["'hello \\1 + 2\\ number 3'", "'|hello |\\|1|+|2|\\| number 3|'|"],
    ["'hello'/eng 'hola'/spa", "'|hello|'|/|eng|'|hola|'|/|spa|"],
    ['"Hello \\name\\, how are you?"', '"|Hello |\\|name|\\|, how are you?|"|'],
    ["'Hello \\name\\, how are you?'", "'|Hello |\\|name|\\|, how are you?|'|"],
    ['“Hello \\name\\, how are you?”', '“|Hello |\\|name|\\|, how are you?|”|'],
    ['‘Hello \\name\\, how are you?’', '‘|Hello |\\|name|\\|, how are you?|’|'],
    ['«Hello \\name\\, how are you?»', '«|Hello |\\|name|\\|, how are you?|»|'],
    ['‹Hello \\name\\, how are you?›', '‹|Hello |\\|name|\\|, how are you?|›|'],
    [
        '「Hello \\name\\, how are you?」',
        '「|Hello |\\|name|\\|, how are you?|」|',
    ],
    [
        '『Hello \\name\\, how are you?』',
        '『|Hello |\\|name|\\|, how are you?|』|',
    ],
    ["'I am \\between\\ us'", "'|I am |\\|between|\\| us|'|"],
    [
        "\"hi \\'hello'\\ and \\'hey'\\\"",
        "\"|hi |\\|'|hello|'|\\| and |\\|'|hey|'|\\|\"|",
    ],
    ['[\'\\hi\\\' "hello"]', '[|\'|\\|hi|\\|\'|"|hello|"|]|'],
    ["«hello \\name\\, I 'am' Amy»", "«|hello |\\|name|\\|, I 'am' Amy|»|"],
])('%s -> %s', (code: string, segments: string) => {
    expect(
        tokens(code)
            .map((t) => t.toWordplay())
            .join('|')
    ).toBe(segments);
});

test('Tokenize betweens', () => {});
