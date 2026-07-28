import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';

/**
 * Guards the WCAG 2.2 AA contrast invariant of the app.html palette: every
 * `*-text` color pair must reach 4.5:1 against both the page background and
 * the alternating row background in its mode, so palette edits can't silently
 * regress the axe color-contrast gate in tests/end2end/accessibility.spec.ts.
 */

const appHtml = readFileSync(resolve(__dirname, '../app.html'), 'utf-8');

/** Read a raw `--name: #hex;` palette declaration out of app.html. */
function getPaletteHex(name: string): string {
    const match = appHtml.match(
        new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
    );
    if (match === null)
        throw new Error(`No hex declaration for --${name} in app.html`);
    return match[1];
}

function luminance(hex: string): number {
    const channels = [1, 3, 5].map((offset) => {
        const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.03928
            ? channel / 12.92
            : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
    const [lighter, darker] = [luminance(a), luminance(b)].sort(
        (x, y) => y - x,
    );
    return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG 2.2 AA minimum contrast for normal-size text. */
const AA_TEXT = 4.5;

/** The text-role palette pairs introduced for the AA text/background split. */
const TEXT_COLORS = ['gold-text', 'grey-text', 'blue-text', 'orange-text'];

describe.each(['light', 'dark'] as const)('%s mode', (mode) => {
    // --wordplay-background and --wordplay-alternating-color resolve to these
    // raw pairs in each mode.
    const backgrounds = [
        getPaletteHex(`white-${mode}`),
        getPaletteHex(`very-light-grey-${mode}`),
    ];

    test.each(TEXT_COLORS)(
        `--${'%s'}-${mode} meets ${AA_TEXT}:1 on both backgrounds`,
        (name) => {
            const text = getPaletteHex(`${name}-${mode}`);
            for (const background of backgrounds) {
                expect(
                    contrast(text, background),
                    `--${name}-${mode} ${text} on ${background}`,
                ).toBeGreaterThanOrEqual(AA_TEXT);
            }
        },
    );

    test(`foreground text meets ${AA_TEXT}:1 on both backgrounds`, () => {
        const foreground = getPaletteHex(`black-${mode}`);
        for (const background of backgrounds) {
            expect(contrast(foreground, background)).toBeGreaterThanOrEqual(
                AA_TEXT,
            );
        }
    });

    test(`salient button label (always black) meets ${AA_TEXT}:1 on gold`, () => {
        expect(
            contrast(
                getPaletteHex('black-light'),
                getPaletteHex(`yellow-${mode}`),
            ),
        ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    test(`error text color meets ${AA_TEXT}:1 on the error background`, () => {
        // --wordplay-error resolves to the orange text variant and
        // --wordplay-error-text-color to --color-white in each mode.
        expect(
            contrast(
                getPaletteHex(`white-${mode}`),
                getPaletteHex(`orange-text-${mode}`),
            ),
        ).toBeGreaterThanOrEqual(AA_TEXT);
    });
});
