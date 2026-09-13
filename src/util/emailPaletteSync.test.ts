import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import {
    BorderWidth,
    Dark,
    FontSize,
    Light,
    Radius,
    type EmailScheme,
} from '../../functions/src/email/theme';
import { contrast } from './colorContrast';

/**
 * An email's palette is a copy of the app's, and this is what stops it drifting.
 *
 * The copy exists because `functions/` compiles with its own `rootDir`, and
 * because Gmail resolves no custom properties — so an email must carry literal
 * hex rather than a token. The sign-in mail is what happens without this test:
 * it shipped `#e06c00`, a color in no palette, whose white label measures 3.3:1
 * against a 4.5:1 standard the rest of the app is held to.
 *
 * Only the *raw* `--x-light` / `--x-dark` declarations are read. The
 * `--wordplay-*` layer and the `light-dark()` block are `var()` chains and
 * `color-mix()` calls, and a regex over those is the thing that breaks on an
 * unrelated palette edit.
 */

const appHtml = readFileSync(resolve(__dirname, '../app.html'), 'utf-8');

/** Read a raw `--name: #hex;` declaration, as `paletteContrast.test.ts` does. */
function getPaletteHex(name: string): string {
    const match = appHtml.match(
        new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
    );
    if (match === null)
        throw new Error(`No hex declaration for --${name} in app.html`);
    return match[1] ?? '';
}

/** Read a raw `--name: <value>;` scalar. */
function getPaletteValue(name: string): string {
    const match = appHtml.match(new RegExp(`--${name}:\\s*([^;]+);`));
    if (match === null)
        throw new Error(`No declaration for --${name} in app.html`);
    return (match[1] ?? '').trim();
}

/** Each email color, and the app pair it mirrors. */
const Roles: [keyof EmailScheme, string][] = [
    ['background', 'white'],
    ['foreground', 'black'],
    ['border', 'light-grey'],
    ['alternating', 'very-light-grey'],
    ['link', 'gold-text'],
    ['dimmed', 'grey-text'],
    ['action', 'yellow'],
];

describe.each([
    ['light', Light],
    ['dark', Dark],
] as const)('%s', (mode, scheme) => {
    test.each(Roles)('%s mirrors --%s', (role, name) => {
        expect(scheme[role]).toBe(getPaletteHex(`${name}-${mode}`));
    });

    test('text on the page meets AA', () => {
        expect(
            contrast(scheme.foreground, scheme.background),
        ).toBeGreaterThanOrEqual(4.5);
    });

    test('dimmed text meets AA on the page', () => {
        expect(
            contrast(scheme.dimmed, scheme.background),
        ).toBeGreaterThanOrEqual(4.5);
    });

    test('a link meets AA on the page', () => {
        expect(contrast(scheme.link, scheme.background)).toBeGreaterThanOrEqual(
            4.5,
        );
    });

    test("the action's label meets AA on the action", () => {
        // The whole reason the app paints literal black on gold rather than
        // white: white on this gold is 3.01:1. An email that chose its own
        // orange got 3.3:1 and nothing noticed for a release.
        expect(
            contrast(scheme.actionText, scheme.action),
        ).toBeGreaterThanOrEqual(4.5);
    });
});

describe('the action is the app’s own salient surface', () => {
    test('painted in literal black in both modes', () => {
        // `--wordplay-hover-text` is `--black-light` rather than the
        // mode-flipping foreground, for exactly this reason.
        const black = getPaletteHex('black-light');
        expect(Light.actionText).toBe(black);
        expect(Dark.actionText).toBe(black);
    });
});

describe('scalars', () => {
    test.each([
        [Radius, 'wordplay-border-radius'],
        [BorderWidth, 'wordplay-border-width'],
        [FontSize, 'wordplay-font-size'],
    ])('%s mirrors --%s', (value, name) => {
        expect(value).toBe(getPaletteValue(name));
    });
});
