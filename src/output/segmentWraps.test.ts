import { test, expect } from 'vitest';
import segmentWraps from './segmentWraps';

test.each([
    ['hello world', 'hello -world'],
    ['hello   world', 'hello   -world'],
    ['hello   world   ', 'hello   -world   '],
    ['one two three four', 'one -two -three -four'],
])('Expect %s to be %s', (text, segments) => {
    expect(segmentWraps(text).join('-')).toBe(segments);
});
