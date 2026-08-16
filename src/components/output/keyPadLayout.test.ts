import { expect, test } from 'vitest';
import layoutKeyPad, { type KeyPadSection } from './keyPadLayout';

function layout(...keys: string[]): KeyPadSection[] {
    return layoutKeyPad(new Set(keys));
}

/** The keys of a section, in order, for compact assertions. */
function keysOf(section: KeyPadSection): string[] {
    return section.kind === 'row'
        ? section.keys.map((k) => k.key)
        : section.kind === 'spread'
          ? [
                section.left.key,
                ...section.middle.map((k) => k.key),
                section.right.key,
            ]
          : section.beside.map((k) => k.key);
}

test('Four arrows become one cluster', () => {
    const sections = layout('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight');
    expect(sections).toHaveLength(1);
    expect(sections[0]).toEqual({
        kind: 'arrows',
        up: true,
        down: true,
        left: true,
        right: true,
        beside: [],
    });
});

test('Left and right alone go to opposite edges', () => {
    const sections = layout('ArrowLeft', 'ArrowRight');
    expect(sections).toHaveLength(1);
    expect(sections[0].kind).toBe('spread');
    expect(keysOf(sections[0])).toEqual(['ArrowLeft', 'ArrowRight']);
});

test('A spread carries other keys between its edges', () => {
    // The Heart Attack shape: steer with two thumbs, act in the middle.
    const sections = layout('ArrowLeft', 'ArrowRight', ' ', 'Enter');
    expect(sections).toHaveLength(1);
    expect(keysOf(sections[0])).toEqual([
        'ArrowLeft',
        'Enter',
        ' ',
        'ArrowRight',
    ]);
});

test('A vertical arrow keeps the cluster rather than spreading', () => {
    const sections = layout('ArrowLeft', 'ArrowUp');
    expect(sections[0]).toEqual({
        kind: 'arrows',
        up: true,
        down: false,
        left: true,
        right: false,
        beside: [],
    });
});

test('Letters sit in keyboard order, not alphabetical', () => {
    // The Chimes shape: one row, ordered as the fingers find them.
    const sections = layout('s', 'a', 'g', 'd', 'f');
    expect(sections).toHaveLength(1);
    expect(keysOf(sections[0])).toEqual(['a', 's', 'd', 'f', 'g']);
});

test('Keys off the keyboard map sort after those on it', () => {
    expect(keysOf(layout('é', 'a')[0])).toEqual(['a', 'é']);
});

test('A long row wraps', () => {
    const sections = layout(...'qwertyuiop'.split(''));
    expect(sections).toHaveLength(2);
    expect(keysOf(sections[0])).toHaveLength(8);
    expect(keysOf(sections[1])).toEqual(['o', 'p']);
});

test('Space is last and wide', () => {
    const sections = layout('a', ' ');
    expect(sections).toHaveLength(2);
    const last = sections[1];
    expect(last.kind).toBe('row');
    if (last.kind !== 'row') return;
    expect(last.keys).toEqual([{ key: ' ', wide: true }]);
});

test('Named keys come before characters', () => {
    const sections = layout('a', 'Enter');
    expect(keysOf(sections[0])).toEqual(['Enter']);
    expect(keysOf(sections[1])).toEqual(['a']);
});

test('Other keys sit beside the cluster rather than under it', () => {
    // The Building Blocks shape: eight keys, still only as tall as the
    // cluster, so the pad never grows into the stage.
    const sections = layout(
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'Shift',
        'j',
        ' ',
    );
    expect(sections).toHaveLength(1);
    expect(sections[0].kind).toBe('arrows');
    expect(keysOf(sections[0])).toEqual(['Enter', 'Shift', 'j', ' ']);
});

test('Nothing beside the cluster is stretched', () => {
    // Width beside a cluster is scarce, so a space bar there is a plain key.
    const sections = layout('ArrowUp', 'ArrowDown', ' ');
    expect(sections[0].kind).toBe('arrows');
    if (sections[0].kind !== 'arrows') return;
    expect(sections[0].beside).toEqual([{ key: ' ', wide: false }]);
});

test('No keys is no sections', () => {
    expect(layout()).toEqual([]);
});
