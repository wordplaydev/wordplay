import { beforeAll, describe, expect, test } from 'vitest';
import {
    isCodepointRenderable,
    loadRenderableRanges,
} from '#basis/faces/renderable.ts';
import { isRegionCode } from '#locale/Regions.ts';
import {
    activeElements,
    attentionOf,
    AttentionBudget,
    EggSalience,
    FastOpacity,
    glyphsOf,
    isFast,
    LocalGlyph,
    MaxOpacity,
    movesIn,
    PerceptibleSeconds,
} from './elements.ts';
import { SeasonPalettes } from './palettes.ts';
import {
    ClimateGroups,
    Conditions,
    Seasons,
    SeasonsOf,
    SeasonSymbols,
} from './Season.ts';
import { SeasonDesigns } from './seasons.ts';
import { toSeasonsCSS } from './seasonsCSS.ts';

/**
 * The conventions every season is held to (#108), so a contribution to
 * seasons.ts is reviewed for taste, not for whether it can render or how many
 * figures it puts on screen. Contrast is paletteContrast.test.ts's job.
 */

beforeAll(async () => await loadRenderableRanges());

/** Codepoints that shape a glyph rather than draw one. */
const Shaping = new Set([0x200d, 0xfe0e, 0xfe0f]);

describe.each(Seasons)('%s', (season) => {
    const design = SeasonDesigns[season];

    test.each(Conditions)(
        `asks for no more than ${AttentionBudget} of attention in %s weather, its egg included`,
        (condition) => {
            const egg = Object.keys(design.eggs).length > 0 ? EggSalience : 0;
            expect(attentionOf(design, condition) + egg).toBeLessThanOrEqual(
                AttentionBudget,
            );
        },
    );

    test.each(Conditions)(
        `has something moving at least every ${PerceptibleSeconds}s in %s weather`,
        (condition) => {
            expect(movesIn(design, condition)).toBe(true);
        },
    );

    test(`keeps every figure faint enough to stay background`, () => {
        for (const element of design.elements) {
            expect(element.opacity, element.name).toBeGreaterThan(0);
            expect(element.opacity, element.name).toBeLessThanOrEqual(
                MaxOpacity,
            );
            if (isFast(element))
                expect(
                    element.opacity,
                    `${element.name} moves fast, so must be faint`,
                ).toBeLessThanOrEqual(FastOpacity);
        }
    });

    test('shows something when chosen by name', () => {
        expect(activeElements(design, undefined).length).toBeGreaterThan(0);
    });

    test('draws only glyphs a bundled font can render', () => {
        const glyphs = [
            ...design.elements.flatMap((element) =>
                glyphsOf(element.composition),
            ),
            ...design.cast.glyphs,
            ...Object.values(design.eggs).flatMap((egg) =>
                egg === undefined ? [] : [egg.glyph],
            ),
            SeasonSymbols[season],
        ].filter((glyph) => glyph !== LocalGlyph);
        for (const glyph of glyphs)
            for (const character of glyph) {
                const codepoint = character.codePointAt(0) ?? 0;
                if (Shaping.has(codepoint)) continue;
                expect(
                    isCodepointRenderable(codepoint),
                    `${glyph} U+${codepoint.toString(16)} in ${season} renders as tofu`,
                ).toBe(true);
            }
    });

    test('names its easter eggs by region code', () => {
        for (const region of Object.keys(design.eggs))
            expect(isRegionCode(region), region).toBe(true);
    });

    test('names each element once', () => {
        const names = design.elements.map((element) => element.name);
        expect(new Set(names).size).toBe(names.length);
    });

    test('has a palette', () => {
        expect(Object.keys(SeasonPalettes[season]).length).toBeGreaterThan(0);
    });
});

test('every season occurs in some climate', () => {
    const occurring = new Set(
        ClimateGroups.flatMap((group) => SeasonsOf[group]),
    );
    for (const season of Seasons) expect(occurring.has(season)).toBe(true);
});

test("each season's symbol is its own", () => {
    const symbols = Seasons.map((season) => SeasonSymbols[season]);
    expect(new Set(symbols).size).toBe(symbols.length);
});

test('the season stylesheet recolors each season by raw pairs alone', () => {
    const css = toSeasonsCSS();
    for (const season of Seasons)
        expect(css).toContain(`:root[data-season="${season}"]{`);
    // Nothing but raw pair declarations, so it can't smuggle in a rule that
    // reaches past the palette.
    const declarations = css
        .replace(/:root\[data-season="[a-zA-Z]+"\]\{/g, '')
        .replaceAll('}', ';')
        .split(';')
        .filter((part) => part !== '');
    for (const declaration of declarations)
        expect(declaration).toMatch(
            /^--[a-z-]+-(light|dark):#[0-9a-f]{6}([0-9a-f]{2})?$/,
        );
});
