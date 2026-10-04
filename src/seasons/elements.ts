import type { RegionCode } from '#locale/Regions.ts';
import type { Condition } from './Season.ts';

/**
 * The vocabulary seasons are built from (#108). A season is data — which
 * glyphs, composed how, moving how, how many, where — so adding to one never
 * needs a new component. A new composition or motion is the rare framework
 * change, reviewed as one; everything in seasons.ts is just its use.
 */

/** A glyph, or `'local'`: the reader's own script's exemplar (Scripts.ts), so
 *  every reader finds their writing system inside the weather. */
export type Glyph = string;

export const LocalGlyph = 'local';

/** How glyphs combine into one figure. */
export type Composition =
    /** One glyph. */
    | { kind: 'single'; glyph: Glyph }
    /** Copies rotated evenly around a center: a snowflake, a sun's rays. */
    | { kind: 'radial'; glyph: Glyph; count: number; center?: Glyph }
    /** Glyphs stacked bottom to top, each smaller: a snowman, an inuksuk. */
    | { kind: 'stack'; glyphs: Glyph[] }
    /** Glyphs in a line along the inline axis: dunes, terraces, a horizon. */
    | { kind: 'row'; glyphs: Glyph[] };

/** How a figure moves. Every motion is scaled by --animation-factor, and at
 *  zero each holds a still pose rather than disappearing. */
export const Motions = [
    /** Tumbling all the way to the ground, resting there in a small heap,
     *  then fading and falling again: snow, leaves, petals. */
    'fall',
    /** Straight down at a slant, without turning: rain and drizzle. */
    'pour',
    /** Slowly across, wrapping: clouds, dust, a camel. */
    'drift',
    /** Slowly upward, fading: steam, heat shimmer, kites. */
    'rise',
    /** Rocking about its base: grass, a chime, a branch. */
    'sway',
    /** Gentle up and down in place: a snowman, a boat. */
    'bob',
    /** A slow arc along the horizon that never sets: the midnight sun. */
    'orbit',
    /** Brightening and dimming in place, never fast enough to flash. */
    'glow',
    /** Nothing at all. */
    'still',
] as const;

export type Motion = (typeof Motions)[number];

/** Where in the page's margins a figure lives. Never behind the text column. */
export type Placement =
    /** The upper part of the margins; falling motions start here. */
    | 'sky'
    /** The bottom edge of the margins. */
    | 'ground'
    /** Anywhere along the margins. */
    | 'margin';

/** A palette role, so a figure follows the season's colors and dark mode. */
export type Tone =
    | 'foreground'
    | 'muted'
    | 'highlight'
    | 'link'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'orange'
    /** Its own colors: emoji keep theirs. */
    | 'color';

export type ElementSpec = {
    /** A stable name, for review and tests. */
    name: string;
    composition: Composition;
    motion: Motion;
    /** How many per screenful of page; a long page gets proportionally more.
     *  Held to the season's attention budget, not a fixed cap. */
    count: number;
    /** How much contrast each figure has, from faint texture to accent. */
    opacity: number;
    /** Size range, in em of the page's font. */
    size: readonly [number, number];
    /** Seconds one cycle of the motion takes at an animation factor of 1. */
    duration: number;
    placement: Placement;
    tone: Tone;
    /** Only in these typical conditions; always, if absent. */
    when?: readonly Condition[];
};

/** A rare regional surprise: one glyph, one motion, at most once a visit. */
export type Egg = {
    glyph: Glyph;
    motion: Motion;
    placement: Placement;
    tone: Tone;
};

/** What an egg costs the attention budget: one medium accent. */
export const EggSalience = 2;

/** What the landing stage's floating cast does in a season. */
export type CastMotion = 'bounce' | 'fall' | 'rise' | 'drift';

export type SeasonDesign = {
    /** The condition shown when the season is chosen by name rather than by
     *  place, so it looks like itself: snow for winter, rain for wet. */
    typical: Condition;
    elements: readonly ElementSpec[];
    cast: { glyphs: readonly Glyph[]; motion: CastMotion };
    eggs: Partial<Record<RegionCode, Egg>>;
};

/**
 * How much of a reader's attention a season may ask for, per screenful. A
 * season is held to a budget of salience rather than a number of figures, so
 * thirty faint raindrops can make an atmosphere where four bold ones would
 * crowd the page. Calibrated so that eight medium figures at the old opacity
 * land near it.
 */
export const AttentionBudget = 16;

/** No figure is more than this opaque: they are background, never content. */
export const MaxOpacity = 0.6;

/** A motion this fast or faster, in seconds per cycle, draws the eye... */
export const FastSeconds = 3;

/** ...so a fast figure must be this faint, keeping busy texture quiet. */
export const FastOpacity = 0.25;

/** A season must have a figure moving at least this often, in seconds per
 *  cycle, or it reads as a picture rather than weather. */
export const PerceptibleSeconds = 20;

export function isFast(element: ElementSpec): boolean {
    return element.motion !== 'still' && element.duration < FastSeconds;
}

/** How much attention one element asks for: how many, how big, how much
 *  contrast, and how much its motion pulls the eye. */
export function salienceOf(element: ElementSpec): number {
    const size = (element.size[0] + element.size[1]) / 2;
    const motion = element.motion === 'still' ? 0.5 : isFast(element) ? 1.5 : 1;
    return element.count * size * size * element.opacity * motion;
}

/** The attention a season asks for in a condition, per screenful. */
export function attentionOf(
    design: SeasonDesign,
    condition: Condition | undefined,
): number {
    return activeElements(design, condition).reduce(
        (total, element) => total + salienceOf(element),
        0,
    );
}

/** Whether something in the season visibly moves in this condition. */
export function movesIn(
    design: SeasonDesign,
    condition: Condition | undefined,
): boolean {
    return activeElements(design, condition).some(
        (element) =>
            element.motion !== 'still' &&
            element.duration <= PerceptibleSeconds,
    );
}

/** The elements a condition shows: those with no condition, and those for it.
 *  No condition means the season's typical one. */
export function activeElements(
    design: SeasonDesign,
    condition: Condition | undefined,
): ElementSpec[] {
    const shown = condition ?? design.typical;
    return design.elements.filter(
        (element) => element.when === undefined || element.when.includes(shown),
    );
}

/** Every glyph a figure draws, for renderability checks. */
export function glyphsOf(composition: Composition): Glyph[] {
    switch (composition.kind) {
        case 'single':
            return [composition.glyph];
        case 'radial':
            return composition.center === undefined
                ? [composition.glyph]
                : [composition.glyph, composition.center];
        case 'stack':
        case 'row':
            return composition.glyphs;
    }
}
