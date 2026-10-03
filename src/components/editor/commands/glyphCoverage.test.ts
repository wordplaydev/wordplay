import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect, test } from 'vitest';
import Commands from './Commands';
import AllMarkupCommands from '#components/editor/markup/MarkupCommands.ts';

/**
 * Every glyph the tokenizer recognizes as a symbol of the language can be
 * typed by someone who has no key for it: an insert command (reachable from
 * the glyph row, the shortcuts dialog, and keybindings) or a markup command
 * offers it, or the exemption below says how else it is reached. The glyphs
 * are read from the tokenizer's own tables, so a new symbol with no way to
 * insert it fails here rather than shipping as something only a copy-paste
 * can produce (the audit found ↤, ≈, ◆ and – that way).
 */

const root = resolve(__dirname, '../../../..');
const symbolsSource = readFileSync(
    resolve(root, 'src/parser/Symbols.ts'),
    'utf-8',
);
const tokenizerSource = readFileSync(
    resolve(root, 'src/parser/Tokenizer.ts'),
    'utf-8',
);

/** Each symbol constant's value, by name. */
const constants = new Map<string, string>();
for (const match of symbolsSource.matchAll(
    /^export const ([A-Z_0-9]+) = '((?:[^'\\]|\\.)*)';/gmu,
))
    constants.set(match[1] ?? '', (match[2] ?? '').replace(/\\(.)/g, '$1'));

/** The names used as literal token patterns. */
const patternNames = [
    ...tokenizerSource.matchAll(/pattern: ([A-Z_0-9]+)/g),
].map((match) => match[1] ?? '');

/** The explicit characters of the operator class, with its named ranges
 *  and escapes removed, and its interpolated constants resolved. */
const operatorsLine = tokenizerSource.match(/^const OPERATORS = `(.*)`;$/mu);
const operators = (operatorsLine?.[1] ?? '')
    .replace(
        /\$\{([A-Z_0-9]+)\}/g,
        (_, name: string) => constants.get(name) ?? '',
    )
    .replace(/\\\\u[0-9A-Fa-f]{4}-\\\\u[0-9A-Fa-f]{4}/g, '')
    .replace(/\\\\u[0-9A-Fa-f]{4}/g, '')
    .replace(/\\\\(.)/g, '$1');

/** How a glyph with no command is reached, when it is reached another way. */
const Exempt: Record<string, string> = {
    '∂': 'an alternate spelling of ∆, which insert-change offers',
    '`…`': 'how a formatted type is displayed, never a token a creator types',
    '🌍': 'the menu offers the locale test; the globe is chosen there, not typed',
    '🌎': 'the menu offers the locale test; the globe is chosen there, not typed',
    '🌏': 'the menu offers the locale test; the globe is chosen there, not typed',
    '）': 'the fullwidth form an East Asian input method types for )',
};

const offered = new Set(
    [...Commands, ...AllMarkupCommands].map((command) => command.symbol),
);

function isAscii(text: string): boolean {
    return /^[\x20-\x7e]*$/.test(text);
}

const glyphs = new Set<string>([
    ...patternNames
        .map((name) => constants.get(name))
        .filter((value): value is string => value !== undefined),
    ...Array.from(operators),
]);

test('the tokenizer tables were read', () => {
    expect(patternNames.length).toBeGreaterThan(20);
    expect(operators).toContain('×');
});

test.each([...glyphs].filter((glyph) => !isAscii(glyph)).sort())(
    'the symbol %s can be inserted without a key for it',
    (glyph) => {
        const reason = Exempt[glyph];
        expect(
            offered.has(glyph) || reason !== undefined,
            `no insert command offers ${glyph}; add one, or an exemption saying how it is reached`,
        ).toBe(true);
    },
);

test('every exemption names a glyph the tokenizer still has', () => {
    const stale = Object.keys(Exempt).filter((glyph) => !glyphs.has(glyph));
    expect(stale, 'exempted but no longer a symbol').toEqual([]);
});
