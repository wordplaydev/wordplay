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
    // The range operator is a two-dot leader, so it terminates names and numbers on both
    // sides and never swallows a decimal. Three dots still lex as the stream symbol.
    ['1‥10', '1|‥|10|'],
    ['a‥b', 'a|‥|b|'],
    ['0.5‥3', '0.5|‥|3|'],
    ['-1‥1', '-1|‥|1|'],
    ['1‥∞', '1|‥|∞|'],
    ['1...10', '1|...|10|'],
    ['0∞π!#', '0|∞|π|!#|'],
    ['🌏🌍🌎', '🌏|🌍|🌎|'],
    [
        '一 十 百 百一 百四十五 百九十九 千一 万十一 万',
        '一|十|百|百一|百四十五|百九十九|千一|万十一|万|',
    ],
    ['三億 五兆 三億五千万', '三億|五兆|三億五千万|'],
    // A Han numeral never splits a word written entirely in Han, since 一/四/十 commonly
    // start ordinary CJK words. Crossing scripts still reads as a number with a unit.
    ['四角形 四捨五入 一致する 一部分', '四角形|四捨五入|一致する|一部分|'],
    ['四m 十二s 三億kg 五つ', '四|m|十二|s|三億|kg|五|つ|'],
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
    // UI, how-to, codepoint, and character references keep `/`.
    ['`@UI/button`', '`|@UI/button|`|'],
    ['`@Stage/color`', '`|@Stage/color|`|'],
    ['`@U/1F600`', '`|@U/1F600|`|'],
    // Hex-looking names are ordinary names (possible concept/character names),
    // not codepoints; only the `@U/<hex>` namespace denotes a codepoint.
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
        [
            Sym.Doc,
            Sym.Words,
            Sym.Mention,
            Sym.ListOpen,
            Sym.Words,
            Sym.Union,
            Sym.Words,
            Sym.ListClose,
            Sym.Doc,
            Sym.End,
        ],
    ],
    // A space between the mention and the [ means no branch: all words.
    [
        '¶this is $1 [hi|no]¶',
        [
            Sym.Doc,
            Sym.Words,
            Sym.Mention,
            Sym.Words,
            Sym.Words,
            Sym.Words,
            Sym.Words,
            Sym.Words,
            Sym.Words,
            Sym.Doc,
            Sym.End,
        ],
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
        [
            Sym.Doc,
            Sym.Mention,
            Sym.ListOpen,
            Sym.Words,
            Sym.Union,
            Sym.Words,
            Sym.ListClose,
            Sym.Words,
            Sym.Words,
            Sym.Words,
            Sym.Doc,
            Sym.End,
        ],
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
        [
            Sym.Doc,
            Sym.Words,
            Sym.TagOpen,
            Sym.Words,
            Sym.Link,
            Sym.URL,
            Sym.TagClose,
            Sym.Doc,
            Sym.End,
        ],
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
        // An email address is a link a creator can write down (#193). Before
        // this, `hi` was words and `@wordplay.dev` was a concept link that
        // resolved to nothing.
        '¶write to hi@wordplay.dev today¶',
        [Sym.Doc, Sym.Words, Sym.URL, Sym.Words, Sym.Doc, Sym.End],
    ],
    ['¶hi@wordplay.dev¶', [Sym.Doc, Sym.URL, Sym.Doc, Sym.End]],
    [
        // A concept link still is one, as long as it doesn't follow an email
        // local part — the same rule plain text literals have always had.
        '¶see @Phrase now¶',
        [Sym.Doc, Sym.Words, Sym.Concept, Sym.Words, Sym.Doc, Sym.End],
    ],
    [
        // The `/` form stays unambiguous mid-word: a domain never has one.
        '¶hi@amy/cat¶',
        [Sym.Doc, Sym.Words, Sym.Concept, Sym.Doc, Sym.End],
    ],
    [
        // A labelled mailto link: the first @ separates, the second belongs to
        // the address.
        '¶<Email us@mailto:hi@wordplay.dev>¶',
        [
            Sym.Doc,
            Sym.TagOpen,
            Sym.Words,
            Sym.Link,
            Sym.URL,
            Sym.TagClose,
            Sym.Doc,
            Sym.End,
        ],
    ],
    [
        '¶see http://localhost:8080 now¶',
        [Sym.Doc, Sym.Words, Sym.URL, Sym.Words, Sym.Doc, Sym.End],
    ],
    // An unclosed branch ends at a paragraph break, so a later ] or | is words.
    [
        '¶$1[unclosed\n\nsecond ] paragraph | here¶',
        [
            Sym.Doc,
            Sym.Mention,
            Sym.ListOpen,
            Sym.Words,
            Sym.Words,
            Sym.Words,
            Sym.Words,
            Sym.Words,
            Sym.Words,
            Sym.Doc,
            Sym.End,
        ],
    ],
    // A reference's name ends where the script changes, so text attached to a
    // reference in a language that writes it that way stays words (#1245).
    // Korean particle:
    ['¶@Doc의 뜻¶', [Sym.Doc, Sym.Concept, Sym.Words, Sym.Doc, Sym.End]],
    // Devanagari danda, and an Arabic comma:
    ['¶@language।¶', [Sym.Doc, Sym.Concept, Sym.Words, Sym.Doc, Sym.End]],
    ['¶@value،¶', [Sym.Doc, Sym.Concept, Sym.Words, Sym.Doc, Sym.End]],
    // A whole phrase glued onto a reference:
    [
        '¶@wordplayプログラムを作る¶',
        [Sym.Doc, Sym.Concept, Sym.Words, Sym.Doc, Sym.End],
    ],
    // A name written entirely in another script is one reference, so a locale's
    // own glossary form still resolves.
    ['¶@프로그램¶', [Sym.Doc, Sym.Concept, Sym.Doc, Sym.End]],
    // Unchanged: plain references, members, characters, codepoints.
    ['¶@Phrase¶', [Sym.Doc, Sym.Concept, Sym.Doc, Sym.End]],
    ['¶@Color.random¶', [Sym.Doc, Sym.Concept, Sym.Doc, Sym.End]],
    ['¶@amy/cat¶', [Sym.Doc, Sym.Concept, Sym.Doc, Sym.End]],
    ['¶@U/1F600¶', [Sym.Doc, Sym.Concept, Sym.Doc, Sym.End]],
    // A character named in another script still resolves, since the rule is
    // per segment.
    ['¶@amy/고양이¶', [Sym.Doc, Sym.Concept, Sym.Doc, Sym.End]],
    // An all-ASCII typo is still one name, so it stays visibly broken rather
    // than silently resolving to a prefix.
    ['¶@Phrasee¶', [Sym.Doc, Sym.Concept, Sym.Doc, Sym.End]],
    // Full width list close now matches in code, like full width list open.
    ['［1］', [Sym.ListOpen, Sym.Number, Sym.ListClose, Sym.End]],
    // A Han word that starts with a numeral is a name, not a number and a unit.
    ['四角形', [Sym.Name, Sym.End]],
    // Crossing out of Han still reads as a number with a unit.
    ['四m', [Sym.Number, Sym.Name, Sym.End]],
])('%s has syms %j', (code: string, expected: SymType[]) => {
    expect(tokens(code).map((t) => t.getTypes()[0])).toEqual(expected);
});

// Presentation selectors are asymmetric: the COLOR selector (U+FE0F) carries no
// meaning (a bare emoji-default codepoint already renders in color) and is
// normalized away, while the MONO selector (U+FE0E) is the only way to ask for
// text presentation, so it has to survive into the token text and the value.
test.each([
    // The color selector is stripped wherever it appears.
    ["'\u{1F44D}\uFE0F'", "'\u{1F44D}'"],
    ['\u{1F508}.\u{1F32C}\uFE0F', '\u{1F508}.\u{1F32C}'],
    // A keycap keeps working: its FE0F is optional in the sequence.
    ["'2\uFE0F\u20E3'", "'2\u20E3'"],
    // The mono selector survives, in text and in markup alike.
    ["'\u{1F44D}\uFE0E'", "'\u{1F44D}\uFE0E'"],
    ['`\u{1F44D}\uFE0E`', '`\u{1F44D}\uFE0E`'],
])('%s tokenizes to %s', (code: string, expected: string) => {
    expect(
        tokens(code)
            .map((t) => t.getText())
            .join(''),
    ).toBe(expected);
});

test('a name resolves the same with or without a color selector', () => {
    // Instruments.wp relies on this: `\u{1F508}.\u{1F32C}\uFE0F` has to reach
    // the definition named `\u{1F32C}`.
    const withSelector = tokens('\u{1F32C}\uFE0F').map((t) => t.getText());
    const without = tokens('\u{1F32C}').map((t) => t.getText());
    expect(withSelector).toEqual(without);
});
