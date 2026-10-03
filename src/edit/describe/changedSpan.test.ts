import UnicodeString from '#unicode/UnicodeString.ts';
import { expect, test } from 'vitest';
import changedSpan from './changedSpan.ts';

const span = (before: string, after: string) =>
    changedSpan(new UnicodeString(before), new UnicodeString(after));

test.each([
    [
        'an insertion',
        '1 + 2',
        '1 + 2 + 3',
        { position: 5, removed: '', added: ' + 3' },
    ],
    [
        'a deletion',
        '1 + 2 + 3',
        '1 + 2',
        { position: 5, removed: ' + 3', added: '' },
    ],
    [
        'a replacement',
        'a: 1',
        'a: 22',
        { position: 3, removed: '1', added: '22' },
    ],
    ['a wrap', '1', '(1)', { position: 0, removed: '1', added: '(1)' }],
    // Graphemes, not code units: an emoji counts as one position.
    [
        'an emoji appended',
        '🙂',
        '🙂🙃',
        { position: 1, removed: '', added: '🙃' },
    ],
])('finds %s', (_, before, after, expected) => {
    expect(span(before, after)).toEqual(expected);
});

test('identical text has no span', () => {
    expect(span('1 + 2', '1 + 2')).toBeUndefined();
});

test('a repeated character is attributed once, not twice', () => {
    // Prefix and suffix must not overlap: 'aa' → 'aaa' adds one 'a', not two.
    expect(span('aa', 'aaa')).toEqual({ position: 2, removed: '', added: 'a' });
});
