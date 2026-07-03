import { Sym, type SymType } from '@nodes/Sym';
import { expect, test } from 'vitest';
import { tokens } from '@parser/Tokenizer';

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
    ['0∞π!#', '0|∞|π|!#|'],
    ['🌏🌍🌎', '🌏|🌍|🌎|'],
    [
        '一 十 百 百一 百四十五 百九十九 千一 万十一 万',
        '一|十|百|百一|百四十五|百九十九|千一|万十一|万|',
    ],
    ['三億 五兆 三億五千万', '三億|五兆|三億五千万|'],
    ['๐ ๑๒๓ ๑๒๓.๔๕ -๔๒ ๕๐%', '๐|๑๒๓|๑๒๓.๔๕|-๔๒|๕๐%|'],
    ['১২৩ ১২৩.৪৫ -৪২ ৫০%', '১২৩|১২৩.৪৫|-৪২|৫০%|'],
    ['१२३ १२३.४५ -४२ ५०%', '१२३|१२३.४५|-४२|५०%|'],
    ['૧૨૩ ૧૨૩.૪૫ -૪૨ ૫૦%', '૧૨૩|૧૨૩.૪૫|-૪૨|૫૦%|'],
    ['੧੨੩ ੧੨੩.੪੫ -੪੨ ੫੦%', '੧੨੩|੧੨੩.੪੫|-੪੨|੫੦%|'],
    ['೧೨೩ ೧೨೩.೪೫ -೪೨ ೫೦%', '೧೨೩|೧೨೩.೪೫|-೪೨|೫೦%|'],
    ['௧௨௩ ௧௨௩.௪௫ -௪௨ ௫௦%', '௧௨௩|௧௨௩.௪௫|-௪௨|௫௦%|'],
    ['౧౨౩ ౧౨౩.౪౫ -౪౨ ౫౦%', '౧౨౩|౧౨౩.౪౫|-౪౨|౫౦%|'],
    ['()[]{}<>:.,ƒf↑↓!•∆…¶`', '(|)|[|]|{|}|<|>|:|.|,|ƒ|f|↑|↓|!|•|∆|…|¶|`|'],
    [
        '⊥⊤?¿??+-×·÷???/^√%boomy=≠<>≤≥⎡?⎡+⎡-⎡:⎦⎡&|~',
        '⊥|⊤|?|¿|??|+|-|×|·|÷|???|/|^|√|%|boomy|=|≠|<|>|≤|≥|⎡?|⎡+|⎡-|⎡:|⎦|⎡|&|||~|',
    ],
    ['¶hello¶', '¶|hello|¶|'],
    ['¶hello \\1 + 1\\¶', '¶|hello |\\|1|+|1|\\|¶|'],
    ['¶hello @bind!¶', '¶|hello |@bind|!|¶|'],
    [
        '¶hello *hello* /hello/ _hello_¶',
        '¶|hello |*|hello|*| |/|hello|/| |_|hello|_|¶|',
    ],
    [
        '¶hello <link@https://amyjko.com>¶',
        '¶|hello |<|link|@|https://amyjko.com|>|¶|',
    ],
    ['¶hello <3!¶', '¶|hello <3!|¶|'],
    // A spaced branch is not a branch: the [, |, ] lex as words (see the sym tests below).
    ['¶this is $1 [hi|no]¶', '¶|this is |$1| |[|hi|||no|]|¶|'],
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
    ['1 + *2* 3', '1|+|3|'],
    /** Ensure all variants on concepts are tokenized correctly */
    ['`@Boolean`', '`|@Boolean|`|'],
    // A concept and its member/subconcept use `.` (mirrors property access).
    ['`@Color.random`', '`|@Color.random|`|'],
    ['`@Phrase.size`', '`|@Phrase.size|`|'],
    // A trailing sentence period is not part of the link.
    ['`see @Color.`', '`|see |@Color|.|`|'],
    ['`@Color. next`', '`|@Color|. next|`|'],
    // UI, how-to, and character references keep `/`.
    ['`@UI/button`', '`|@UI/button|`|'],
    ['`@Stage/color`', '`|@Stage/color|`|'],
    ['`@11`', '`|@11|`|'],
    ['`@2222`', '`|@2222|`|'],
    ['`@ABCDEF`', '`|@ABCDEF|`|'],
    // Pattern literals: the body reinterprets glyphs (see LANGUAGE.md), and a
    // quoted literal is one raw token (no markup/concept/code segmentation).
    ['⣿3 # "-" 4 #⣿', '⣿|3|#|"-"|4|#|⣿|'],
    ['⣿◌ _ # ␣ …⣿', '⣿|◌|_|#|␣|…|⣿|'],
    ["'a1' ⌕ ⣿◌⣿", "'|a1|'|⌕|⣿|◌|⣿|"],
    ['⣿w: ▭/en >0 ␣ w⣿', '⣿|w|:|▭|/|en|>|0|␣|w|⣿|'],
    ['⣿~# | ⊢ ⊣⣿', '⣿|~|#|||⊢|⊣|⣿|'],
    ['⣿_/greek "a"–"z"⣿', '⣿|_|/|greek|"a"|–|"z"|⣿|'],
    // A raw pattern literal: `@foo` is characters, not a concept/code segment.
    ['⣿"@foo"⣿', '⣿|"@foo"|⣿|'],
    ['⣿▸(#) ◂(#)⣿', '⣿|▸|(|#|)|◂|(|#|)|⣿|'],
    ['⣿≤1 ≥0⣿', '⣿|≤|1|≥|0|⣿|'],
    ['•⣿⣿', '•|⣿|⣿|'],
    // An Example span's closing `\` ends the example even when a pattern inside
    // it is left unclosed (so docs can SHOW a malformed pattern). The `\` is not
    // swallowed as pattern content; it pops the pattern + example contexts.
    ['¶\\⣿\\¶', '¶|\\|⣿|\\|¶|'],
    ['¶\\⣿>0 #\\¶', '¶|\\|⣿|>|0|#|\\|¶|'],
    ['`\\⣿\\`', '`|\\|⣿|\\|`|'],
    // Outside a pattern, the same glyphs keep their normal meanings.
    ['_ ⬚ … |', '_|⬚|…|||'],
])('%s -> %s', (code: string, segments: string) => {
    expect(
        tokens(code)
            .map((t) => t.toWordplay())
            .join('|'),
    ).toBe(segments);
});

/** In markup, delimiters only tokenize as delimiters where they have syntactic meaning;
 * everywhere else they are ordinary words, so stray symbols never break markup parsing. */
test.each([
    // A branch immediately after a mention lexes as branch delimiters.
    [
        '¶this is $1[hi|no]¶',
        [Sym.Doc, Sym.Words, Sym.Mention, Sym.ListOpen, Sym.Words, Sym.Union, Sym.Words, Sym.ListClose, Sym.Doc, Sym.End],
    ],
    // A space between the mention and the [ means no branch: all words.
    [
        '¶this is $1 [hi|no]¶',
        [Sym.Doc, Sym.Words, Sym.Mention, Sym.Words, Sym.Words, Sym.Words, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End],
    ],
    // Bare list delimiters are words.
    [
        '¶Hello [list]¶',
        [Sym.Doc, Sym.Words, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End],
    ],
    // Full width list delimiters are also words.
    [
        '¶Hello ［list］¶',
        [Sym.Doc, Sym.Words, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End],
    ],
    // A bare union symbol is words.
    ['¶a | b¶', [Sym.Doc, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End]],
    // A bare list close is words.
    ['¶x ] y¶', [Sym.Doc, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End]],
    // Escaped list delimiters are unaffected: one words run.
    ['¶a [[x]] b¶', [Sym.Doc, Sym.Words, Sym.Doc, Sym.End]],
    // A union outside a branch is words even when a branch appears earlier.
    [
        '¶$1[a|b] | c¶',
        [Sym.Doc, Sym.Mention, Sym.ListOpen, Sym.Words, Sym.Union, Sym.Words, Sym.ListClose, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End],
    ],
    // A bare tag close is words.
    ['¶a > b¶', [Sym.Doc, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End]],
    // A bare @ that isn't a concept link is words.
    [
        '¶email @ me¶',
        [Sym.Doc, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End],
    ],
    // A link tag still lexes as tag delimiters.
    [
        '¶hello <link@https://amyjko.com>¶',
        [Sym.Doc, Sym.Words, Sym.TagOpen, Sym.Words, Sym.Link, Sym.URL, Sym.TagClose, Sym.Doc, Sym.End],
    ],
    // A bare URL still lexes as a URL so its // isn't treated as an escaped italic.
    [
        '¶see https://amyjko.com works¶',
        [Sym.Doc, Sym.Words, Sym.URL, Sym.Words, Sym.Doc, Sym.End],
    ],
    // A bare $ that isn't a mention is words, not unknown.
    ['¶a $ b¶', [Sym.Doc, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End]],
    // A dotless host is still a URL.
    [
        '¶see http://localhost:8080 now¶',
        [Sym.Doc, Sym.Words, Sym.URL, Sym.Words, Sym.Doc, Sym.End],
    ],
    // An unclosed branch ends at a paragraph break, so a later ] or | is words.
    [
        '¶$1[unclosed\n\nsecond ] paragraph | here¶',
        [Sym.Doc, Sym.Mention, Sym.ListOpen, Sym.Words, Sym.Words, Sym.Words, Sym.Words, Sym.Words, Sym.Words, Sym.Doc, Sym.End],
    ],
    // Full width list close now matches in code, like full width list open.
    ['［1］', [Sym.ListOpen, Sym.Number, Sym.ListClose, Sym.End]],
])('%s has syms %j', (code: string, expected: SymType[]) => {
    expect(tokens(code).map((t) => t.getTypes()[0])).toEqual(expected);
});
