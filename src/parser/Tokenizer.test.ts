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
