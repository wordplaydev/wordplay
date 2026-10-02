// Type-only, like Physics.ts: erased at build, so nothing here makes Rapier eager.
import type * as RAPIER from '@dimforge/rapier2d-compat';
// Type-only: the triangulator is imported when an outline loads, so it stays
// off every page's static import graph.
import type Earcut from 'earcut';
import { writable } from 'svelte/store';
import {
    flattenGlyphLoops,
    shapeTextGlyphs,
    type OutlinePoint,
} from '#basis/faces/shapeText.ts';
import { PX_PER_METER } from '#output/Output/outputToCSS.ts';

/** A glyph's outline as closed contours, in **em units**, y-up from the
 *  baseline with x measured from the text's origin. The outer contour of an `o`
 *  and its counter are two separate loops. */
export type OutlineLoops = OutlinePoint[][];

/** One glyph's loops, and whether it is an emoji, whose holes are not holes:
 *  the monochrome face draws a smiley as a ring around floating eyes, but the
 *  color picture on stage is a solid face. */
export type GlyphLoops = { loops: OutlineLoops; emoji: boolean };

/** A text's outline as solid convex parts, in em units like
 *  {@link OutlineLoops} so one cache entry serves every size. Each part is a
 *  flat list of x/y pairs. */
export type OutlineMesh = Float32Array[];

/** How far apart outline samples are, in em. A 1/64 em step is about 4px on a
 *  4m phrase — fine enough that a ball rolls along a curve rather than down a
 *  staircase, coarse enough that a glyph stays a handful of convex parts. */
const SPACING_EM = 1 / 64;

/** Beyond this many points, fall back to the bounding box. A long enough phrase
 *  would otherwise be one body of hundreds of parts, and a body that big
 *  is not one anything nestles into anyway. */
const MAX_POINTS = 2000;

/** Bumped whenever an outline finishes loading, so a view can re-run the layout
 *  that asked for it. Physics.sync runs on scene change rather than per frame,
 *  so without this signal an outline that arrives after a body was built would
 *  never be applied. Mirrors `fontsLoadedGeneration`. */
export const glyphOutlinesGeneration = writable(0);

/** Resolved outlines, keyed by outlineKey. `null` records a face/text that has
 *  no usable outline — an uncovered character, an unreachable file — so we ask for
 *  it once rather than on every sync. */
const outlines = new Map<string, OutlineMesh | null>();

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
): OutlineMesh | undefined {
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
    let mesh: OutlineMesh | null = null;
    try {
        const shaped = await shapeTextGlyphs(text, face, weight, italic);
        if (typeof shaped !== 'string') {
            const glyphs = shaped.map((glyph) => ({
                loops: flattenGlyphLoops(
                    glyph.commands,
                    // Font units to em, so the loops are size-independent.
                    1 / glyph.unitsPerEm,
                    SPACING_EM,
                    glyph.xEm,
                    glyph.yEm,
                ),
                emoji: glyph.emoji,
            }));
            const { default: earcut } = await import('earcut');
            mesh = outlineMesh(glyphs, earcut) ?? null;
        }
    } catch {
        // Any unexpected failure means no outline, which is already the
        // fallback; never let it become an unhandled rejection.
        mesh = null;
    }
    loading.delete(key);
    outlines.set(key, mesh);
    glyphOutlinesGeneration.update((generation) => generation + 1);
}

/** Whether a point lies inside a closed loop, by even-odd ray casting. */
function insideLoop(point: OutlinePoint, loop: OutlinePoint[]): boolean {
    let inside = false;
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
        const a = loop[i];
        const b = loop[j];
        if (a === undefined || b === undefined) continue;
        if (
            a.y > point.y !== b.y > point.y &&
            point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
        )
            inside = !inside;
    }
    return inside;
}

/**
 * The loops of one glyph that no other loop of it encloses: an emoji's
 * silhouette, which is what the color picture on stage fills. Dropping the
 * rest also keeps an emoji — whose eyes, mouth and details are all loops —
 * inside the point budget.
 */
export function outermostLoops(loops: OutlineLoops): OutlineLoops {
    return loops.filter((loop, index) => {
        const start = loop[0];
        return (
            start === undefined ||
            !loops.some(
                (other, otherIndex) =>
                    otherIndex !== index && insideLoop(start, other),
            )
        );
    });
}

/** A solid region of a glyph: its outer loop and the counters cut out of it. */
export type Polygon = { outer: OutlinePoint[]; holes: OutlinePoint[][] };

/**
 * Group one glyph's loops into solid polygons with holes, by how deeply each is
 * nested. A loop inside no other is solid; one inside one other is a counter in
 * it; one inside two is an island in that counter (a dot inside an `O`), solid
 * again; and so on. Deciding by nesting rather than winding direction is what
 * makes this independent of how a font happened to draw its contours.
 */
export function polygonsOf(loops: OutlineLoops): Polygon[] {
    const containers = loops.map((loop, index) => {
        const start = loop[0];
        return start === undefined
            ? []
            : loops.filter(
                  (other, otherIndex) =>
                      otherIndex !== index && insideLoop(start, other),
              );
    });
    const polygons = new Map<OutlinePoint[], Polygon>();
    loops.forEach((loop, index) => {
        if ((containers[index]?.length ?? 0) % 2 === 0)
            polygons.set(loop, { outer: loop, holes: [] });
    });
    loops.forEach((loop, index) => {
        const around = containers[index] ?? [];
        if (around.length % 2 === 0) return;
        // The loop directly around a counter is the one nested one level less.
        const parent = around.find(
            (other) =>
                (containers[loops.indexOf(other)]?.length ?? 0) ===
                around.length - 1,
        );
        if (parent !== undefined) polygons.get(parent)?.holes.push(loop);
    });
    return [...polygons.values()];
}

/**
 * Cut a text's glyphs into convex parts, or undefined when there is nothing
 * to collide with or too much of it. A letter keeps its counters, so something
 * inside an `O` stays there; an emoji keeps only its silhouette. The
 * triangulator is passed in so this stays pure and the caller decides how to
 * load it.
 */
export function outlineMesh(
    glyphs: GlyphLoops[],
    earcut: typeof Earcut,
): OutlineMesh | undefined {
    const parts: Float32Array[] = [];
    let points = 0;
    for (const glyph of glyphs) {
        // A traced loop repeats its first point to close; to the triangulator
        // that is a second vertex in the same place, which it can build
        // zero-area triangles from. A loop of fewer than three points encloses
        // nothing.
        const loops = glyph.loops
            .map((loop) => {
                const first = loop[0];
                const last = loop.at(-1);
                return loop.length > 1 &&
                    first !== undefined &&
                    last !== undefined &&
                    first.x === last.x &&
                    first.y === last.y
                    ? loop.slice(0, -1)
                    : loop;
            })
            .filter((loop) => loop.length >= 3);
        const polygons = glyph.emoji
            ? outermostLoops(loops).map((outer) => ({ outer, holes: [] }))
            : polygonsOf(loops);
        for (const { outer, holes } of polygons) {
            const flat: number[] = [];
            const holeStarts: number[] = [];
            for (const ring of [outer, ...holes]) {
                if (ring !== outer) holeStarts.push(flat.length / 2);
                for (const point of ring) flat.push(point.x, point.y);
            }
            for (const part of convexParts(flat, earcut(flat, holeStarts)))
                parts.push(part);
            points += flat.length / 2;
        }
    }
    // Too many points is a phrase too long to be worth a body this detailed.
    if (parts.length === 0 || points > MAX_POINTS) return undefined;
    return parts;
}

/** Twice the signed area of a polygon given as vertex indices into `flat`:
 *  positive when counterclockwise (y-up). */
function signedArea(flat: number[], polygon: number[]): number {
    let area = 0;
    for (let index = 0; index < polygon.length; index++) {
        const a = polygon[index] ?? 0;
        const b = polygon[(index + 1) % polygon.length] ?? 0;
        area +=
            (flat[a * 2] ?? 0) * (flat[b * 2 + 1] ?? 0) -
            (flat[b * 2] ?? 0) * (flat[a * 2 + 1] ?? 0);
    }
    return area;
}

/** Whether a counterclockwise polygon turns left (or goes straight) at every
 *  corner. */
function isConvex(flat: number[], polygon: number[]): boolean {
    for (let index = 0; index < polygon.length; index++) {
        const a = polygon[index] ?? 0;
        const b = polygon[(index + 1) % polygon.length] ?? 0;
        const c = polygon[(index + 2) % polygon.length] ?? 0;
        const cross =
            ((flat[b * 2] ?? 0) - (flat[a * 2] ?? 0)) *
                ((flat[c * 2 + 1] ?? 0) - (flat[a * 2 + 1] ?? 0)) -
            ((flat[b * 2 + 1] ?? 0) - (flat[a * 2 + 1] ?? 0)) *
                ((flat[c * 2] ?? 0) - (flat[a * 2] ?? 0));
        if (cross < -1e-12) return false;
    }
    return true;
}

/**
 * Merge a triangulation into a few convex parts, by removing each interior edge
 * whose two sides would still make a convex polygon (Hertel–Mehlhorn). Raw
 * triangles fan out from corners in slivers, and a body sliding past a corner
 * where many meet catches on them however their seams are treated; a handful of
 * large parts, like a convex decomposition gives, slides cleanly.
 */
export function convexParts(
    flat: number[],
    triangles: number[],
): Float32Array[] {
    const polygons: (number[] | undefined)[] = [];
    for (let index = 0; index + 2 < triangles.length; index += 3) {
        const triangle = [
            triangles[index] ?? 0,
            triangles[index + 1] ?? 0,
            triangles[index + 2] ?? 0,
        ];
        if (signedArea(flat, triangle) < 0) triangle.reverse();
        polygons.push(triangle);
    }

    // Which polygons each undirected edge belongs to; an edge with two owners
    // is interior, a candidate for removal.
    const edgeKey = (a: number, b: number) =>
        a < b ? `${a}:${b}` : `${b}:${a}`;
    const owners = new Map<string, number[]>();
    polygons.forEach((polygon, id) =>
        polygon?.forEach((a, index) => {
            const edge = edgeKey(a, polygon[(index + 1) % polygon.length] ?? a);
            owners.set(edge, [...(owners.get(edge) ?? []), id]);
        }),
    );

    for (const [edge, ids] of owners) {
        const [p, q] = ids;
        if (ids.length !== 2 || p === undefined || q === undefined) continue;
        const first = polygons[p];
        const second = polygons[q];
        if (first === undefined || second === undefined) continue;
        // In the first polygon the shared edge runs from one end to the other;
        // walk it from the edge's far end round to its near end, then the
        // second polygon from there back, dropping the shared edge.
        const [a, b] = edge.split(':').map(Number);
        const forward = first.some(
            (vertex, index) =>
                vertex === a && first[(index + 1) % first.length] === b,
        );
        const near = forward ? a : b;
        const far = forward ? b : a;
        const rotate = (polygon: number[], vertex: number | undefined) => {
            const at = polygon.indexOf(vertex ?? -1);
            return [...polygon.slice(at), ...polygon.slice(0, at)];
        };
        const merged = [
            ...rotate(first, far),
            ...rotate(second, near).slice(1, -1),
        ];
        if (!isConvex(flat, merged)) continue;
        polygons[p] = merged;
        polygons[q] = undefined;
        // The second polygon's other edges now belong to the merged one.
        for (const [other, list] of owners)
            if (other !== edge && list.includes(q))
                owners.set(
                    other,
                    list.map((id) => (id === q ? p : id)),
                );
    }

    return polygons
        .filter((polygon) => polygon !== undefined)
        .map(
            (polygon) =>
                new Float32Array(
                    polygon.flatMap((vertex) => [
                        flat[vertex * 2] ?? 0,
                        flat[vertex * 2 + 1] ?? 0,
                    ]),
                ),
        );
}

/**
 * A collider matching the glyph outline, or undefined if it can't be built.
 *
 * Solid convex parts rather than a polyline, because these bodies are dynamic
 * and have to collide with each other: a polyline is a boundary with no
 * interior, and two polylines never touch, so a pile of letters would fall
 * through itself. The parts come from triangulating the outline rather than
 * from a convex decomposition, which voxelizes and fills every counter, so the
 * inside of an `O` stays empty.
 *
 * The parts are in em; `size`, `width`, `height` and `baseline` (the painted
 * baseline's depth below the box top) are in meters, and the result is in the
 * collider's local frame — engine pixels, y-down, centered on the bounding box,
 * which is where `OutputBody` puts every other collider.
 */
export function glyphColliderDesc(
    rapier: typeof RAPIER,
    mesh: OutlineMesh,
    size: number,
    width: number,
    height: number,
    baseline: number,
): RAPIER.ColliderDesc | undefined {
    const shapes: RAPIER.Shape[] = [];
    for (const part of mesh) {
        if (part.length < 6) continue;
        const vertices = new Float32Array(part.length);
        for (let index = 0; index < part.length; index += 2) {
            vertices[index] =
                ((part[index] ?? 0) * size - width / 2) * PX_PER_METER;
            // The baseline sits `baseline` below the box top and the box
            // center `height / 2` below it, so the baseline is `baseline -
            // height / 2` below center; a point `y` em above the baseline
            // rises from there.
            vertices[index + 1] =
                (baseline - height / 2 - (part[index + 1] ?? 0) * size) *
                PX_PER_METER;
        }
        // Computing the hull settles the winding the y flip reversed, and
        // drops the collinear points merging leaves along a straight edge.
        const polygon = new rapier.ConvexPolygon(vertices, false);
        // But the engine gives up on a sliver, whose nearly parallel edges it
        // reads as collinear, and one missing shape fails the whole compound.
        // Ask it, and cut a sliver into triangles, which it takes as they are.
        const raw: ReturnType<RAPIER.Shape['intoRaw']> | undefined =
            polygon.intoRaw();
        if (raw !== undefined) {
            raw.free();
            shapes.push(polygon);
        } else
            for (let index = 2; index + 1 < vertices.length; index += 2)
                shapes.push(
                    new rapier.Triangle(
                        { x: vertices[0] ?? 0, y: vertices[1] ?? 0 },
                        {
                            x: vertices[index] ?? 0,
                            y: vertices[index + 1] ?? 0,
                        },
                        {
                            x: vertices[index + 2] ?? 0,
                            y: vertices[index + 3] ?? 0,
                        },
                    ),
                );
    }
    if (shapes.length === 0) return undefined;

    // Without FIX_INTERNAL_EDGES, the seams between parts are ledges that stop
    // a body sliding across a letter's flat top. Only a compound can fix them
    // in 2D; a triangle mesh's equivalent flag is 3D only.
    return rapier.ColliderDesc.compound(
        shapes,
        shapes.map(() => ({ x: 0, y: 0 })),
        shapes.map(() => 0),
        rapier.CompoundFlags.FIX_INTERNAL_EDGES,
    );
}
