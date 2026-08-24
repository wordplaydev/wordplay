import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { contrast } from './colorContrast';

/**
 * Guards the one thing paletteContrast.test.ts can't see: what a control paints
 * its *text* in while it is hovered.
 *
 * --wordplay-hover is the same gold as --wordplay-highlight-color, and
 * .highlight-surface in app.html already works out that text on it must be
 * literal black — --wordplay-foreground is #ffffff in dark mode and measures
 * 3.58:1 there. But a hovered element can't carry a class, so every :hover rule
 * that paints the gold has to restate it, and eleven of them shipped without a
 * color at all. This test finds any rule that paints the gold as a background
 * and requires it to name a text color, then measures that color on the gold in
 * both modes.
 */

const root = resolve(__dirname, '..');
const appHtml = readFileSync(resolve(root, 'app.html'), 'utf-8');

/** Read a raw `--name: #hex;` palette declaration out of app.html. */
function getPaletteHex(name: string): string {
    const match = appHtml.match(
        new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
    );
    if (match === null)
        throw new Error(`No hex declaration for --${name} in app.html`);
    return match[1];
}

/** Resolve a `var(--name)` chain declared in app.html down to a hex, so this
 *  tracks the stylesheet rather than agreeing with a copy of it. */
function resolvePaletteVar(name: string, mode: 'light' | 'dark'): string {
    // The mode pairs are declared as `--x-light`/`--x-dark`, and the mode block
    // aliases `--color-x` to one of them; resolve the alias by suffix rather
    // than by parsing light-dark(), which the palette states two ways.
    for (const candidate of [`${name}-${mode}`, name]) {
        const hex = appHtml.match(
            new RegExp(`--${candidate}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
        );
        if (hex !== null) return hex[1];
    }
    const alias = appHtml.match(
        new RegExp(`--${name}:\\s*var\\(--([a-z0-9-]+)\\)\\s*;`),
    );
    if (alias === null)
        throw new Error(`Can't resolve --${name} to a hex in app.html`);
    return resolvePaletteVar(alias[1], mode);
}

/** WCAG 2.2 AA minimum contrast for normal-size text. */
const AA_TEXT = 4.5;

/**
 * Rules that paint the gold but legitimately declare no text color, each with
 * the reason. A rule not listed here and not declaring a color is a failure —
 * silence is never the answer, the way it was for the eleven this test was
 * written for.
 */
const NoTextColorNeeded: Record<string, string> = {
    'components/wellspring/Wellspring.svelte':
        'The drag-over bin holds only an emoji, which carries its own color.',
    'components/concepts/StructureConceptView.svelte':
        'The gold is a halo behind a Speech bubble whose .message repaints the background over it, so no text ever sits on the gold; pinning a color here made dark-mode prose black on a black bubble.',
};

/** Every `background[-color]: var(--wordplay-hover)` declaration, with the
 *  declarations that follow it inside the same rule. */
function goldRules(): { file: string; rule: string }[] {
    const found: { file: string; rule: string }[] = [];
    for (const file of globSync('**/*.svelte', { cwd: root })) {
        const source = readFileSync(resolve(root, file), 'utf-8');
        for (const match of source.matchAll(
            /background(?:-color)?:\s*var\(--wordplay-hover\)\s*;([^}]*)/g,
        ))
            found.push({ file, rule: match[1] });
    }
    return found;
}

describe('text on the gold hover background', () => {
    const rules = goldRules();

    test('there are gold hover rules to check', () => {
        // A rename of --wordplay-hover would otherwise make this suite pass by
        // finding nothing at all.
        expect(rules.length).toBeGreaterThan(5);
    });

    test.each(rules.map((r) => r.file))('%s declares a text color', (file) => {
        const rule = rules.find((r) => r.file === file);
        if (rule === undefined) throw new Error('unreachable');
        if (file in NoTextColorNeeded) {
            expect(
                rule.rule,
                `${file} is listed as needing no text color, but declares one`,
            ).not.toMatch(/(?:^|[^-])color:/);
            return;
        }
        expect(
            rule.rule,
            `${file} paints --wordplay-hover behind text but names no color; either declare color: var(--wordplay-hover-text) or add it to NoTextColorNeeded with a reason`,
        ).toMatch(/(?:^|[^-])color:\s*var\(--wordplay-hover-text\)/);
    });
});

describe.each(['light', 'dark'] as const)('%s mode', (mode) => {
    test(`--wordplay-hover-text meets ${AA_TEXT}:1 on --wordplay-hover`, () => {
        const text = resolvePaletteVar('wordplay-hover-text', mode);
        const background = resolvePaletteVar('wordplay-hover', mode);
        expect(
            contrast(text, background),
            `${text} on ${background}`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
    });
});

test('the plain foreground fails on gold in one mode, which is why a literal is needed', () => {
    // Asserts the hazard rather than an invariant. --wordplay-foreground is
    // --color-black, which flips with the mode: #000000 in light (6.98:1 on the
    // gold, fine) and #ffffff in dark (3.58:1, the failure this all exists for).
    // A literal is the only thing that can pass in both. If the palette ever
    // moves so both modes pass, every rule carrying the override can be revisited.
    const ratios = (['light', 'dark'] as const).map((mode) =>
        contrast(
            getPaletteHex(`black-${mode}`),
            resolvePaletteVar('wordplay-hover', mode),
        ),
    );
    expect(
        Math.min(...ratios),
        `the mode-flipping foreground is legible on gold in both modes (${ratios.map((r) => r.toFixed(2)).join(', ')}); the overrides may be unnecessary`,
    ).toBeLessThan(AA_TEXT);
});
