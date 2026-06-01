import { expect, test } from 'vitest';
import { setInternalClipboard, wasCopiedHere } from './InternalClipboard';

test('wasCopiedHere recognizes text last copied from within Wordplay', () => {
    setInternalClipboard('"hello"\n"hello"\n"hello"');
    expect(wasCopiedHere('"hello"\n"hello"\n"hello"')).toBe(true);
    expect(wasCopiedHere('something else')).toBe(false);
});
