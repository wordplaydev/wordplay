import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, test } from 'vitest';
import { contrast } from './colorContrast';

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

/** WCAG 2.2 AA minimum contrast for normal-size text. */
const AA_TEXT = 4.5;

/** WCAG 2.2 AA (1.4.11) minimum contrast for non-text UI parts. */
const NON_TEXT = 3.0;

/**
 * The hex `.highlight-surface` actually paints its text and links in, read out
 * of the rule rather than hard-coded, so this tracks the stylesheet instead of
 * agreeing with a copy of it.
 */
function highlightSurfaceTextColor(): string {
    const rule = appHtml.match(/\.highlight-surface\s*\{([^}]*)\}/);
    if (rule === null)
        throw new Error('No .highlight-surface rule in app.html');
    const color = rule[1].match(/(?:^|[^-])color:\s*var\(--([a-z-]+)\)/);
    if (color === null)
        throw new Error('.highlight-surface declares no var() color');
    return getPaletteHex(color[1]);
}

/** Read a `--name: #rrggbbaa;` translucent palette declaration out of app.html. */
function getPaletteHexAlpha(name: string): { hex: string; alpha: number } {
    const match = appHtml.match(
        new RegExp(`--${name}:\\s*#([0-9a-fA-F]{6})([0-9a-fA-F]{2})\\s*;`),
    );
    if (match === null)
        throw new Error(`No translucent declaration for --${name} in app.html`);
    return { hex: `#${match[1]}`, alpha: parseInt(match[2], 16) / 255 };
}

/** Composite a translucent color over an opaque one, as the browser paints it. */
function composite(
    top: { hex: string; alpha: number },
    bottom: string,
): string {
    const channels = (hex: string) =>
        [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const [tr, tg, tb] = channels(top.hex);
    const [br, bg, bb] = channels(bottom);
    const mix = (t: number, b: number) =>
        Math.round(t * top.alpha + b * (1 - top.alpha))
            .toString(16)
            .padStart(2, '0');
    return `#${mix(tr, br)}${mix(tg, bg)}${mix(tb, bb)}`;
}

/** The text-role palette pairs introduced for the AA text/background split. */
const TEXT_COLORS = ['gold-text', 'grey-text', 'blue-text', 'orange-text'];

describe.each(['light', 'dark'] as const)('%s mode', (mode) => {
    // --wordplay-background and --wordplay-alternating-color resolve to these
    // raw pairs in each mode.
    const backgrounds = [
        getPaletteHex(`white-${mode}`),
        getPaletteHex(`very-light-grey-${mode}`),
    ];

    test(`a link on the selection tint meets ${AA_TEXT}:1`, () => {
        // --wordplay-hover-light tints a hovered or chosen project tile, and a
        // tile carries its project's name as a link. A tint is a background for
        // whatever it covers, so it is bounded by the text on it — which the
        // `*-text` cases above never see, since they only measure the opaque
        // page colors. Dark shipped at 4.16:1 and axe caught it on the projects
        // page. Measured against the page background, which is what a tile sits
        // on; the alternating color is not a tile surface.
        const tint = getPaletteHexAlpha(`yellow-transparent-${mode}`);
        const link = getPaletteHex(`gold-text-${mode}`);
        expect(
            contrast(link, composite(tint, getPaletteHex(`white-${mode}`))),
        ).toBeGreaterThanOrEqual(AA_TEXT);
    });

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

    test(`a link on a gold surface needs an override to be visible at all`, () => {
        // --wordplay-link-color's dark value and --wordplay-highlight-color's
        // are the same hex, so an un-overridden link on a gold surface is not
        // merely low-contrast but perfectly invisible — 1.00:1 — with only an
        // emoji subscript surviving, since emoji carry their own color. This
        // asserts the hazard rather than an invariant: any container painted
        // --wordplay-highlight-color or --wordplay-hover MUST set
        // --wordplay-link-color, the way .highlight-surface does. If this ever
        // starts failing because the palette moved, the rules that carry that
        // override can be revisited.
        expect(
            contrast(
                getPaletteHex(`gold-text-${mode}`),
                getPaletteHex(`yellow-${mode}`),
            ),
            'the default link color is legible on gold; the overrides may be unnecessary',
        ).toBeLessThan(AA_TEXT);
    });

    test(`what .highlight-surface paints its text and links meets ${AA_TEXT}:1 on gold`, () => {
        // The rule uses --black-light for both `color` and
        // --wordplay-link-color. It used to use --color-white, which is
        // #ffffff in light mode and measured 3.01:1 here — a shipped AA
        // failure this test did not cover, because it checked text colors
        // against the page background but never against gold.
        const painted = highlightSurfaceTextColor();
        expect(
            contrast(painted, getPaletteHex(`yellow-${mode}`)),
            `.highlight-surface text ${painted} on gold`,
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

    test(`focus indicator meets ${NON_TEXT}:1 on both backgrounds`, () => {
        // --wordplay-focus-color is a non-text indicator (WCAG 1.4.11): focus
        // outlines and rings must be discernible against the page and
        // alternating backgrounds. The brand --color-blue fails this in light
        // mode, which is why --focus-blue-* exists as a separate pair.
        const focus = getPaletteHex(`focus-blue-${mode}`);
        for (const background of backgrounds) {
            expect(
                contrast(focus, background),
                `--focus-blue-${mode} ${focus} on ${background}`,
            ).toBeGreaterThanOrEqual(NON_TEXT);
        }
    });

    test(`focused-button label meets ${AA_TEXT}:1 on the focus color`, () => {
        // Buttons with backgrounds paint the focus color behind
        // --wordplay-foreground text when focused, so the focus blue must
        // also work as a text background. White-on-#3a72fe measured 4.18:1
        // before the focus pair was split from --color-blue.
        expect(
            contrast(
                getPaletteHex(`black-${mode}`),
                getPaletteHex(`focus-blue-${mode}`),
            ),
            `foreground on --focus-blue-${mode}`,
        ).toBeGreaterThanOrEqual(AA_TEXT);
    });

    /**
     * The fills the app paints behind controls, by palette pair name. These
     * are the surfaces that must carry `saturated-surface` (app.html): the
     * focus ring is a luminance match for each of them, so the ring alone is
     * not a discernible indicator there.
     */
    const SATURATED_FILLS = ['orange-text', 'yellow', 'pink'];

    test.each(SATURATED_FILLS)(
        `the focus ring misses ${NON_TEXT}:1 on --%s, so that fill needs a band`,
        (name) => {
            // Asserts the hazard, like the link-on-gold test above: if the
            // palette ever moves so the ring passes on one of these on its
            // own, that surface can drop `saturated-surface`.
            const fill = getPaletteHex(`${name}-${mode}`);
            expect(
                contrast(getPaletteHex(`focus-blue-${mode}`), fill),
                `--focus-blue-${mode} on --${name}-${mode} ${fill}`,
            ).toBeLessThan(NON_TEXT);
        },
    );

    test(`the focus band is discernible against the ring and every saturated fill`, () => {
        // `.saturated-surface` draws its second band in --wordplay-background.
        // That works as a universal band only if it clears 1.4.11 against both
        // the ring it sits inside and every fill it sits on — which is what
        // makes the two-band indicator survive a surface the ring can't reach,
        // and survive greyscale, where the ring's hue difference is gone.
        const band = getPaletteHex(`white-${mode}`);
        expect(
            contrast(band, getPaletteHex(`focus-blue-${mode}`)),
            `the band ${band} against the focus ring`,
        ).toBeGreaterThanOrEqual(NON_TEXT);
        for (const name of SATURATED_FILLS) {
            const fill = getPaletteHex(`${name}-${mode}`);
            expect(
                contrast(band, fill),
                `the band ${band} on --${name}-${mode} ${fill}`,
            ).toBeGreaterThanOrEqual(NON_TEXT);
        }
    });

    test(`the chrome grey is the one fill the band can't rescue in light mode`, () => {
        // --wordplay-chrome is where both halves of the scheme run out: the
        // ring misses 1.4.11 on it in both modes, and in light mode so does a
        // page-background band (2.65:1), so `saturated-surface` would not
        // rescue it there. Dark mode's darker grey does take a band (4.06:1).
        // Only SensorMonitor paints this fill and nothing focusable sits on it
        // today; this records the gap so a control landing there later is a
        // decision rather than an accident.
        const chrome = getPaletteHex(`light-grey-${mode}`);
        expect(
            contrast(getPaletteHex(`focus-blue-${mode}`), chrome),
            `--focus-blue-${mode} on the chrome grey`,
        ).toBeLessThan(NON_TEXT);
        const banded = contrast(getPaletteHex(`white-${mode}`), chrome);
        if (mode === 'light')
            expect(
                banded,
                'a band now works on the light chrome grey; it could host controls',
            ).toBeLessThan(NON_TEXT);
        else expect(banded).toBeGreaterThanOrEqual(NON_TEXT);
    });

    test(`the border grey's 1.4.11 status is as documented`, () => {
        // --wordplay-border-color deliberately keeps --color-light-grey even
        // though it misses 1.4.11's 3:1 in light mode (2.65:1; app.html says
        // so where it's assigned): borders here are decorative separation,
        // and every essential boundary carries another cue. Dark mode's grey
        // happens to pass (4.06:1). Like the link-on-gold test above, this
        // asserts the hazard rather than an invariant, so that if the light
        // palette ever moves past 3:1 the waiver can be retired knowingly.
        const ratio = contrast(
            getPaletteHex(`light-grey-${mode}`),
            getPaletteHex(`white-${mode}`),
        );
        if (mode === 'light')
            expect(
                ratio,
                'the light border grey now passes 1.4.11; revisit the waiver comment in app.html',
            ).toBeLessThan(NON_TEXT);
        else expect(ratio).toBeGreaterThanOrEqual(NON_TEXT);
    });
});
