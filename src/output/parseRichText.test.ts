import { test, expect } from 'vitest';
import parseRichText from './parseRichText';

test.each([
    ['hello', 'hello'],
    ['hello _world_', 'hello <u>world</u>'],
    ['hello /world/', 'hello <em>world</em>'],
    ['hello *world*', "hello <span class='light'>world</span>"],
    ['hello **world**', 'hello <strong>world</strong>'],
    ['hello ***world***', "hello <span class='extra'>world</span>"],
    ['hello /**wor**ld/!', 'hello <em><strong>wor</strong>ld</em>!'],
    ['hello\n\nworld', '<p>hello</p><p>world</p>'],
])('Test rich text parsing', (markup, html) => {
    expect(parseRichText(markup).toHTML()).toBe(html);
});
