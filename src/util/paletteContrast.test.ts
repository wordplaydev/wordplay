import { describe, expect, test } from 'vitest';
import { contrast } from './colorContrast';
import {
    applyOverride,
    isHex,
    isSeasonalName,
    type Palette,
    type PaletteOverride,
} from '#seasons/palette.ts';
import { SeasonPalettes } from '#seasons/palettes.ts';
import {
    AppHtml,
    readDefaultPalette,
    readPaletteHex,
} from '#seasons/readDefaultPalette.ts';
import {
    AA_TEXT,
    checkNoRegression,
    checkRolePairs,
    NON_TEXT,
    type ContrastFailure,
} from '#seasons/rolePairs.ts';
import { Seasons } from '#seasons/Season.ts';

/**
 * Guards the WCAG 2.2 AA contrast of every palette the app can paint, so a
 * palette edit can't silently regress the axe color-contrast gate in
 * tests/end2end/accessibility.spec.ts.
 *
 * Every pairing the interface relies on lives in src/seasons/rolePairs.ts and
 * is checked here against the default palette and every season's (#108).
 * Contrast is a fact about a palette, so this is where it is decided, not page
 * by page.
 */

const getPaletteHex = readPaletteHex;

/**
 * The hex `.highlight-surface` actually paints its text and links in, read out
 * of the rule rather than hard-coded, so this tracks the stylesheet instead of
 * agreeing with a copy of it.
 */
function highlightSurfaceTextColor(): string {
    const rule = AppHtml.match(/\.highlight-surface\s*\{([^}]*)\}/);
    if (rule === null)
        throw new Error('No .highlight-surface rule in app.html');
    const color = rule[1]!.match(/(?:^|[^-])color:\s*var\(--([a-z-]+)\)/);
    if (color === null)
        throw new Error('.highlight-surface declares no var() color');
    return getPaletteHex(color[1]!);
}

const DefaultPalette = readDefaultPalette();

const Palettes: [string, Palette, PaletteOverride][] = [
    ['default', DefaultPalette, {}],
    ...Seasons.map((season): [string, Palette, PaletteOverride] => [
        season,
        applyOverride(DefaultPalette, SeasonPalettes[season]),
        SeasonPalettes[season],
    ]),
];

const describeFailure = (f: ContrastFailure) =>
    `${f.mode}: ${f.ink} on ${f.on} is ${f.ratio.toFixed(2)}:1, needs ${f.minimum}:1 (${f.role})`;

describe.each(Palettes)('the %s palette', (_, palette, override) => {
    test('meets every role pair in both modes', () => {
        expect(checkRolePairs(palette).map(describeFailure)).toEqual([]);
    });

    test('takes no color below the level it reaches by default', () => {
        expect(
            checkNoRegression(DefaultPalette, palette).map(describeFailure),
        ).toEqual([]);
    });

    test('recolors only what a season may, in the shape it had', () => {
        for (const [key, pair] of Object.entries(override)) {
            expect(isSeasonalName(key), `${key} is not seasonal`).toBe(true);
            if (!isSeasonalName(key)) continue;
            expect(isHex(pair.light) && isHex(pair.dark), key).toBe(true);
            // A tint must stay a tint and an opaque color opaque, since the
            // composite checks assume the default's shape.
            expect(pair.light.length, key).toBe(
                DefaultPalette[key].light.length,
            );
            expect(pair.dark.length, key).toBe(DefaultPalette[key].dark.length);
        }
    });
});

/**
 * What follows asserts the default palette's own hazards and waivers: places
 * the default *fails* on purpose, each with the rule that compensates. They
 * are the default's history, so they aren't asked of seasons, whose safety is
 * the role table above.
 */
describe.each(['light', 'dark'] as const)('%s mode', (mode) => {
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
