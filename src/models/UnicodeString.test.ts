import { test, expect } from 'vitest';
import UnicodeString from './UnicodeString';

expect(new UnicodeString('🌷🎁💩😜👍🏳️‍🌈').getLength()).toBe(6);

test.each([
    ['happy', '!', 5, 'happy!'],
    ['happy', 's', 0, 'shappy'],
    ['happy', '!', 6, undefined],
])('Insert "%s" "%s" at %i', (start, insertion, position, result) => {
    const s = new UnicodeString(start);
    expect(s.withGraphemesAt(insertion, position)?.toString()).toBe(result);
});

test.each([
    ['happy', 0, 'appy'],
    ['', 0, undefined],
])('Remove grapheme', (start, position, result) => {
    const s = new UnicodeString(start);
    expect(s.withoutGraphemeAt(position)?.toString()).toBe(result);
});
