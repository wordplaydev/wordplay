import { expect, test } from 'vitest';
import segmentWraps from '@output/segmentWraps';

test.each([
    // Latin: trailing whitespace stays with the preceding segment so wrapped
    // lines never start with a leading space. Matches the prior behavior.
    ['hello world', 'en-US', 'hello -world'],
    ['hello   world', 'en-US', 'hello   -world'],
    ['hello   world   ', 'en-US', 'hello   -world   '],
    ['one two three four', 'en-US', 'one -two -three -four'],
    // CJK and Thai: locale-aware dictionary segmentation produces multiple
    // wrap candidates where the old space-only splitter produced exactly one.
    ['你好世界', 'zh-CN', '你好-世界'],
    ['你好，世界！', 'zh-CN', '你好，-世界！'],
    ['こんにちは世界', 'ja-JP', 'こんにちは-世界'],
    ['สวัสดีชาวโลก', 'th-TH', 'สวัสดี-ชาว-โลก'],
])('Expect %s in %s to segment to %s', (text, locale, segments) => {
    expect(segmentWraps(text, locale).join('-')).toBe(segments);
});
