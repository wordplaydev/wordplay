// Type-only, like Physics.ts: erased at build, so nothing here makes Rapier eager.
import type * as RAPIER from '@dimforge/rapier2d-compat';
import { writable } from 'svelte/store';
import {
    flattenGlyphLoops,
    shapeTextGlyphs,
    type OutlinePoint,
} from '@basis/faces/shapeText';
import { PX_PER_METER } from '@output/Output/outputToCSS';

/** A glyph outline as closed contours, in **em units**, y-up from the baseline
 *  with x measured from the text's origin. Em units so one cache entry serves
 *  every size the same text is drawn at. The outer contour of an `o` and its
 *  counter are two separate loops, which is what keeps the counter hollow. */
export type OutlineLoops = OutlinePoint[][];

/** How far apart outline samples are, in em. A 1/64 em step is about 4px on a
 *  4m phrase — fine enough that a ball rolls along a curve rather than down a
 *  staircase, coarse enough that decomposition stays a few milliseconds. */
const SPACING_EM = 1 / 64;

/** Beyond this many points, fall back to the bounding box. A long enough phrase
 *  could otherwise spend an unbounded amount of one frame being decomposed, and
 *  a body that big is not one anything nestles into anyway. */
const MAX_POINTS = 2000;

/** Measured against the true outline over ten Titan One letters, sampled on a
 *  grid: these settings disagree with the glyph on 2.9% of the box, where the
 *  bounding box they replace disagrees on 12-32%. Tightening concavity to
 *  0.001 reaches 2.2% for twice the time, and raising resolution to 256 is
 *  both slower and slightly worse, so this is the knee.
 *
 *  **A counter is filled, at every setting there is.** The decomposition
 *  voxelizes the region the outline bounds and never carves the hole back out,
 *  so nothing rests inside an `o` — that is most of the 2.9%. Open concavity is
 *  what this exists for and is kept faithfully: a ball settles into the bowl of
 *  a `U` and the hook of an `a`. */
const DecompositionParameters = { concavity: 0.01, resolution: 128 };

/** Bumped whenever an outline finishes loading, so a view can re-run the layout
 *  that asked for it. Physics.sync runs on scene change rather than per frame,
 *  so without this signal an outline that arrives after a body was built would
 *  never be applied. Mirrors `fontsLoadedGeneration`. */
export const glyphOutlinesGeneration = writable(0);

/** Resolved outlines, keyed by outlineKey. `null` records a face/text that has
 *  no usable outline — a color emoji font, an unreachable file — so we ask for
 *  it once rather than on every sync. */
const outlines = new Map<string, OutlineLoops | null>();

/** Keys with a load in flight, so concurrent syncs share one request. */
const loading = new Set<string>();

/** Identifies an outline, and doubles as the body's rebuild trigger: a body
 *  built before the outline arrived carries `undefined`, so the key changing is
 *  what tells `sync` to rebuild with the glyph collider. */
export function outlineKey(
    text: string,
    face: string,
    weight: number,
    italic: boolean,
): string {
    return `${face}-${weight}-${italic ? 'i' : 'n'}-${text}`;
}

/**
 * The outline for this text, if it is already loaded. Returns undefined while
 * a load is pending and for text that has no outline at all, since physics
 * treats both the same way: keep the bounding box. Unlike `Contour`, a font
 * failure here is never reported — a collider silently staying rectangular is
 * better than an exception in a program that only asked for nicer collisions.
 */
export function getGlyphOutline(
    text: string,
    face: string,
    weight: number,
    italic: boolean,
): OutlineLoops | undefined {
    const key = outlineKey(text, face, weight, italic);
    const cached = outlines.get(key);
    if (cached !== undefined) return cached ?? undefined;
    if (!loading.has(key)) {
        loading.add(key);
        void load(key, text, face, weight, italic);
    }
    return undefined;
}

async function load(
    key: string,
    text: string,
    face: string,
    weight: number,
    italic: boolean,
) {
    let loops: OutlineLoops | null = null;
    try {
        const shaped = await shapeTextGlyphs(text, face, weight, italic);
        if (typeof shaped !== 'string') {
            const all: OutlineLoops = [];
            let points = 0;
            for (const glyph of shaped) {
                for (const loop of flattenGlyphLoops(
                    glyph.commands,
                    // Font units to em, so the loops are size-independent.
                    1 / glyph.unitsPerEm,
                    SPACING_EM,
                    glyph.xEm,
                    glyph.yEm,
                )) {
                    // A loop of fewer than three points encloses nothing.
                    if (loop.length < 3) continue;
                    points += loop.length;
                    all.push(loop);
                }
            }
            // No outline at all is a color emoji or an uncovered character;
            // too many points is a phrase too long to be worth decomposing.
            if (all.length > 0 && points <= MAX_POINTS) loops = all;
        }
    } catch {
        // Any unexpected failure means no outline, which is already the
        // fallback; never let it become an unhandled rejection.
        loops = null;
    }
    loading.delete(key);
    outlines.set(key, loops);
    glyphOutlinesGeneration.update((generation) => generation + 1);
}

/**
 * A collider matching the glyph outline, or undefined if it can't be built.
 *
 * A convex decomposition rather than a polyline, because these bodies are
 * dynamic and have to collide with each other: a polyline is a boundary with no
 * interior, and two polylines never touch, so a pile of letters would fall
 * through itself. The decomposition is a compound of convex parts, which has
 * volume and collides with anything.
 *
 * `loops` are in em; `size`, `width`, `height` and `ascent` are in meters, and
 * the result is in the collider's local frame — engine pixels, y-down, centered
 * on the bounding box, which is where `OutputBody` puts every other collider.
 */
export function glyphColliderDesc(
    rapier: typeof RAPIER,
    loops: OutlineLoops,
    size: number,
    width: number,
    height: number,
    ascent: number,
): RAPIER.ColliderDesc | undefined {
    let count = 0;
    for (const loop of loops) count += loop.length;
    if (count < 3) return undefined;

    const vertices = new Float32Array(count * 2);
    // One segment per point, since every loop is closed.
    const indices = new Uint32Array(count * 2);
    let vertex = 0;
    let segment = 0;
    for (const loop of loops) {
        const base = vertex;
        for (const point of loop) {
            vertices[vertex * 2] = (point.x * size - width / 2) * PX_PER_METER;
            // The baseline sits `ascent` below the box top and the box center
            // `height / 2` below it, so the baseline is `ascent - height / 2`
            // below center; a point `y` em above the baseline rises from there.
            vertices[vertex * 2 + 1] =
                (ascent - height / 2 - point.y * size) * PX_PER_METER;
            indices[segment * 2] = vertex;
            indices[segment * 2 + 1] =
                vertex + 1 === base + loop.length ? base : vertex + 1;
            vertex += 1;
            segment += 1;
        }
    }

    // Null for a degenerate outline; the caller falls back to the box.
    return (
        rapier.ColliderDesc.convexDecomposition(
            vertices,
            indices,
            DecompositionParameters,
        ) ?? undefined
    );
}
