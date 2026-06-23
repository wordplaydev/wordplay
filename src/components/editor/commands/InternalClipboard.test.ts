import { get } from 'svelte/store';
import { expect, test } from 'vitest';
import {
    ClipboardContents,
    clearInternalClipboard,
    getInternalClipboard,
    setInternalClipboard,
    wasCopiedHere,
} from './InternalClipboard';

test('wasCopiedHere recognizes text last copied from within Wordplay', () => {
    setInternalClipboard('"hello"\n"hello"\n"hello"');
    expect(wasCopiedHere('"hello"\n"hello"\n"hello"')).toBe(true);
    expect(wasCopiedHere('something else')).toBe(false);
});

test('setInternalClipboard updates the footer store and the fast-path getters', () => {
    setInternalClipboard('hello');
    expect(get(ClipboardContents)).toBe('hello');
    expect(getInternalClipboard()).toBe('hello');
    expect(wasCopiedHere('hello')).toBe(true);
});

test('clearInternalClipboard hides the footer and empties the internal cell', () => {
    setInternalClipboard('world');
    clearInternalClipboard();
    expect(get(ClipboardContents)).toBeUndefined();
    expect(getInternalClipboard()).toBeUndefined();
    expect(wasCopiedHere('world')).toBe(false);
});
