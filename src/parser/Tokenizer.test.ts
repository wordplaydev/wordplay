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
])('%s -> %s', (code: string, segments: string) => {
    expect(
        tokens(code)
            .map((t) => t.toWordplay())
            .join('|'),
    ).toBe(segments);
});
