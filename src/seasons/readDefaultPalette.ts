import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Palette, PaletteName } from './palette.ts';

/**
 * The default palette, read out of app.html where it is authored, so the
 * contrast checks and the season generator track the stylesheet rather than
 * agreeing with a copy of it. Node only: tests and scripts, never the app.
 */

export const AppHtml = readFileSync(
    resolve(import.meta.dirname, '../app.html'),
    'utf-8',
);

/** Read a raw `--name: #hex;` (or `#hexaa`) declaration out of app.html. */
export function readPaletteHex(name: string): string {
    const match = AppHtml.match(
        new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?)\\s*;`),
    );
    if (match === null || match[1] === undefined)
        throw new Error(`No hex declaration for --${name} in app.html`);
    return match[1];
}

export function readDefaultPalette(): Palette {
    const pair = (name: PaletteName) => ({
        light: readPaletteHex(`${name}-light`),
        dark: readPaletteHex(`${name}-dark`),
    });
    // Spelled out so the compiler checks the palette is complete.
    return {
        blue: pair('blue'),
        purple: pair('purple'),
        pink: pair('pink'),
        orange: pair('orange'),
        yellow: pair('yellow'),
        'yellow-transparent': pair('yellow-transparent'),
        'gold-text': pair('gold-text'),
        'grey-text': pair('grey-text'),
        'blue-text': pair('blue-text'),
        white: pair('white'),
        'very-light-grey': pair('very-light-grey'),
        'light-grey': pair('light-grey'),
        'dark-grey': pair('dark-grey'),
        pressed: pair('pressed'),
        'focus-blue': pair('focus-blue'),
        'orange-text': pair('orange-text'),
        black: pair('black'),
    };
}
