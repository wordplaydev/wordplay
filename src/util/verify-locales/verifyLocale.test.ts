import { Unwritten } from '@locale/Annotations';
import Log from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import { addMissingKeys, removeExtraKeys } from './verifyLocale';

// Fixtures mirror real locale paths so the tag-based classifier resolves them:
// node.Paragraph.doc is [formatted], basis.*.function.*.names is [name], and
// ui.howto.editor.notification.labels is a positional [plain] tuple.

test('removeExtraKeys keeps longer markup and name arrays', () => {
    const source = {
        node: { Paragraph: { doc: ['a', 'b'] } },
        basis: { Number: { function: { add: { names: ['+', 'add'] } } } },
        input: { Key: { keys: { Alt: ['Alt'] } } },
    };
    const target = {
        node: { Paragraph: { doc: ['x', 'y', 'z'] } },
        basis: { Number: { function: { add: { names: ['p', 'q', 'r'] } } } },
        input: { Key: { keys: { Alt: ['Alt', 'Option'] } } },
    };
    removeExtraKeys(new Log(false), source, target);
    expect(target.node.Paragraph.doc).toEqual(['x', 'y', 'z']);
    expect(target.basis.Number.function.add.names).toEqual(['p', 'q', 'r']);
    expect(target.input.Key.keys.Alt).toEqual(['Alt', 'Option']);
});

test('removeExtraKeys truncates longer positional arrays', () => {
    const source = {
        ui: { howto: { editor: { notification: { labels: ['a', 'b'] } } } },
    };
    const target = {
        ui: {
            howto: { editor: { notification: { labels: ['x', 'y', 'z'] } } },
        },
    };
    removeExtraKeys(new Log(false), source, target);
    expect(target.ui.howto.editor.notification.labels).toEqual(['x', 'y']);
});

test('addMissingKeys pads short positional arrays but not markup or name arrays', () => {
    const source = {
        ui: { howto: { editor: { notification: { labels: ['a', 'b'] } } } },
        node: { Paragraph: { doc: ['a', 'b', 'c'] } },
        basis: { Number: { function: { add: { names: ['+', 'add'] } } } },
        input: { Key: { keys: { Alt: ['Alt', 'Option'] } } },
    };
    const target = {
        ui: { howto: { editor: { notification: { labels: ['x'] } } } },
        node: { Paragraph: { doc: ['x'] } },
        basis: { Number: { function: { add: { names: ['p'] } } } },
        input: { Key: { keys: { Alt: ['Alt'] } } },
    };
    addMissingKeys(new Log(false), source, target);
    expect(target.ui.howto.editor.notification.labels).toEqual([
        'x',
        Unwritten,
    ]);
    expect(target.node.Paragraph.doc).toEqual(['x']);
    expect(target.basis.Number.function.add.names).toEqual(['p']);
    expect(target.input.Key.keys.Alt).toEqual(['Alt']);
});
