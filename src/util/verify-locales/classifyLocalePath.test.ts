import { expect, test } from 'vitest';
import classifyLocalePath from './classifyLocalePath';

test('classifies markup ([formatted]) fields under any key name', () => {
    expect(classifyLocalePath(['node', 'Paragraph', 'doc'])).toBe('markup');
    expect(classifyLocalePath(['basis', 'Number', 'conversion', 's2m'])).toBe(
        'markup',
    );
    expect(
        classifyLocalePath([
            'basis',
            'Number',
            'function',
            'add',
            'inputs',
            0,
            'doc',
        ]),
    ).toBe('markup');
    expect(classifyLocalePath(['ui', 'dialog', 'feedback', 'explanation'])).toBe(
        'markup',
    );
});

test('classifies name ([name]) fields', () => {
    expect(
        classifyLocalePath(['basis', 'Number', 'function', 'add', 'names']),
    ).toBe('name');
    // Key synonym lists are name-like (variable count per locale) despite
    // their [plain] tag, since values like "Caps Lock" aren't valid names.
    expect(classifyLocalePath(['input', 'Key', 'keys', 'Alt'])).toBe('name');
});

test('classifies positional ([plain] or untagged) fields', () => {
    expect(
        classifyLocalePath(['ui', 'howto', 'editor', 'notification', 'labels']),
    ).toBe('plain');
    expect(classifyLocalePath(['regions'])).toBe('plain');
});
