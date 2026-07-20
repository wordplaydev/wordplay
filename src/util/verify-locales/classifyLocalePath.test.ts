import { expect, test } from 'vitest';
import classifyLocalePath, { isNameTextPath } from './classifyLocalePath';

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

test('isNameTextPath is true only for NameText-typed identifier fields', () => {
    expect(isNameTextPath(['basis', 'Number', 'function', 'add', 'names'])).toBe(
        true,
    );
    expect(isNameTextPath(['basis', 'List', 'out'])).toBe(true);
    expect(isNameTextPath(['basis', 'List', 'outofbounds'])).toBe(true);
    expect(isNameTextPath(['basis', 'Map', 'key'])).toBe(true);
    expect(isNameTextPath(['output', 'Easing', 'zippy'])).toBe(true);
    expect(isNameTextPath(['basis', 'Boolean', 'name'])).toBe(true);
    // Display labels tagged [plain] and inline string[] fields are not identifiers.
    expect(isNameTextPath(['node', 'Paragraph', 'name'])).toBe(false);
    expect(
        isNameTextPath([
            'node',
            'Language',
            'conflict',
            'UnknownLanguage',
            'name',
        ]),
    ).toBe(false);
    expect(isNameTextPath(['input', 'Key', 'keys', 'Alt'])).toBe(false);
});
