/**
 * This file contains type definitions and functionality for managing custom characters, which are rendered as SVGs.
 * Aspects of symbols connected to the programming language are in /nodes with the rest of the language and
 * aspects related to rendering are in /output. Everying here is about reasoning about and processing symbols,
 * independent of the the language or rendering.
 *
 * The general concept is to model a simplified representation of SVG, generally to help simplify illustration with
 * vectors.
 *
 * All units are interpreted in pixels, on a 128x128 square canvas.
 */
// From the standalone module, not Color: Character is reachable from the
// database, and Color pulls the whole basis.
import { adaptLightness } from '@output/Color/adapt';
import { LCHtoRGB } from '@output/Color/lch';
import z from 'zod';

const PointSchema = z.object({ x: z.number(), y: z.number() });
export type Point = z.infer<typeof PointSchema>;

const SizeSchema = z.object({ width: z.number(), height: z.number() });

/** See Color.ts for LCH details. */
const ColorSchema = z.object({
    l: z.number(), // 0-1
    c: z.number(), // 0-∞
    h: z.number(), // 0-359, in degrees
});
type Color = z.infer<typeof ColorSchema>;

const StrokeSchema = z.object({
    /** Optional stroke. Null means CSS currentColor */
    color: ColorSchema.nullable(),
    width: z.number(), // pixels
});

const RectangleSchema = z
    .object({
        type: z.literal('rect'),
        point: PointSchema, // The center of the rectangle
        angle: z.number().exactOptional(),
        stroke: StrokeSchema.exactOptional(),
        // Null represents current color
        fill: ColorSchema.nullable().exactOptional(),
        corner: z.number().exactOptional(),
    })
    // The width and height of the rectange.
    .extend(SizeSchema.shape);

export type CharacterRectangle = z.infer<typeof RectangleSchema>;

const PixelSchema = z.object({
    type: z.literal('pixel'),
    point: PointSchema, // The center of the pixel
    fill: ColorSchema.nullable(), // If null, it's currentColor
});
export type CharacterPixel = z.infer<typeof PixelSchema>;

const EllipseSchema = z
    .object({
        type: z.literal('ellipse'),
        point: PointSchema,
        stroke: StrokeSchema.exactOptional(),
        fill: ColorSchema.nullable().exactOptional(),
        angle: z.number().exactOptional(), // degrees
    })
    // The radius on each dimension
    .extend(SizeSchema.shape);

export type CharacterEllipse = z.infer<typeof EllipseSchema>;

/**
 * A point on a path, with an optional quadratic Bezier control point for the
 * segment *arriving* at it. Quadratic rather than cubic because one handle per
 * segment has no tangent continuity to maintain between neighbors, which is what
 * makes a curve reachable by keyboard: the control point is just another point.
 * Path points carry this and other shapes' center points don't, so it extends
 * PointSchema rather than widening it.
 */
const PathPointSchema = PointSchema.extend({
    curve: PointSchema.exactOptional(),
});
export type PathPoint = z.infer<typeof PathPointSchema>;

const PathSchema = z.object({
    type: z.literal('path'),
    stroke: StrokeSchema.exactOptional(),
    // Null represents current color
    fill: ColorSchema.nullable().exactOptional(),
    // A series of positions defining the path.
    points: z.array(PathPointSchema).nonempty(),
    angle: z.number().exactOptional(), // degrees rotated around the center
    // Whether the path is closed by connecting the last point to the first
    closed: z.boolean(),
});
export type CharacterPath = z.infer<typeof PathSchema>;

/**
 * The only characters a stored glyph outline may contain.
 *
 * This string is interpolated straight into an SVG `d` attribute that the app
 * renders with `{@html}`, in half a dozen places, from *other creators'* public
 * documents — and `tag()` below does no escaping, because until now every
 * attribute it wrote was a number or a color. Constraining the value where the
 * document is parsed is what makes that safe: absolute M/L/Q/C/Z commands and
 * numbers, which is exactly the grammar `glyphToPath` emits.
 */
export const GlyphPathPattern = /^[MLQCZ0-9.,\-\s]*$/;

/** A CJK outline runs to a few thousand characters; past this it isn't a glyph. */
export const MaxGlyphPathLength = 16384;

const GlyphWeightSchema = z.union([
    z.literal(100),
    z.literal(200),
    z.literal(300),
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
    z.literal(800),
    z.literal(900),
]);

/**
 * A single character traced from a font, stored as its outline.
 *
 * Positioned and sized like a rectangle — `point` is the top left corner and
 * `width`/`height` its extent — so moving, mirroring, measuring and fitting a
 * glyph all reuse the arithmetic those already have. `d` is the outline
 * normalized into the unit box (0..1 on both axes, already flipped from the
 * font's y-up to SVG's y-down), so placing it is a transform and only a change
 * of character or face has to go back to the font.
 */
const GlyphSchema = z
    .object({
        type: z.literal('glyph'),
        /** The character traced, kept so the outline can be re-derived. */
        character: z.string().min(1).max(16),
        /** A face name. Not an enum: the registry is generated and changes with
         *  the font manifest, and a character made with a face later removed
         *  must still parse and render from the outline it already has. */
        face: z.string(),
        weight: GlyphWeightSchema.exactOptional(),
        italic: z.boolean().exactOptional(),
        point: PointSchema,
        angle: z.number().exactOptional(), // degrees
        stroke: StrokeSchema.exactOptional(),
        // Null represents current color
        fill: ColorSchema.nullable().exactOptional(),
        /** Mirrored across its own vertical axis. A glyph isn't symmetric, so
         *  flipping one has to reflect the outline rather than just move the
         *  box the way it can for a rectangle. A vertical flip is this plus 180
         *  degrees of rotation, so one flag covers both. */
        mirrored: z.boolean().exactOptional(),
        /** The outline, in the unit box. */
        d: z.string().regex(GlyphPathPattern).max(MaxGlyphPathLength),
    })
    .extend(SizeSchema.shape);

export type CharacterGlyph = z.infer<typeof GlyphSchema>;

const CharacterShapeSchema = z.union([
    PixelSchema,
    RectangleSchema,
    EllipseSchema,
    PathSchema,
    GlyphSchema,
]);
export type CharacterShape = z.infer<typeof CharacterShapeSchema>;

/** A 128x128 pixel canvas of layered shapes */
export const CharacterSchema = z.object({
    // A unique identifier for the character
    id: z.string().uuid(),
    // The optional owner of this character. (If it doesn't have one, it was made offline).
    owner: z.string().nullable(),
    // Whether this character is public. Defaults to true.
    public: z.boolean(),
    // The list of uids who can see this character, if not public.
    collaborators: z.array(z.string()),
    // The gallery this character is shared in, if any (#822). Optional so no
    // stored character needs upgrading — the same reason `aliases` is, since
    // characters carry no schema version. A character is in at most one
    // gallery, exactly like a project: security rules have no loop, so
    // membership in several could not be checked with a get() per gallery.
    gallery: z.string().nullable().exactOptional(),
    // The Unix time of when this was last updated, for simple distributed conflict resolution.
    updated: z.number(),
    // owner username/Wordplay name (e.g., "hello/FunnyAnimal")
    name: z.string(),
    // Full names this character used to have, kept when its owner renames.
    // A `@username/Character` reference is a language token and may sit in
    // anyone's project, so the old name has to keep resolving — and rewriting
    // other people's source to chase a rename would be far worse than a lookup
    // that falls back. Optional so no stored character needs upgrading.
    aliases: z.array(z.string()).exactOptional(),
    // A list of tagged names in Wordplay syntax
    description: z.string(),
    // In rendering order, back to front. One union, not a copy of the one
    // above: they were byte-identical, and a new shape kind added to only one
    // of them parses in one place and not the other.
    shapes: z.array(CharacterShapeSchema),
});
export type Character = z.infer<typeof CharacterSchema>;

/**
 * The name a creator types, without the `username/` prefix the stored name
 * carries. One place, because the split was repeated at every surface that
 * shows a character and each had to remember that an unnamed character's
 * `name` may be empty.
 */
export function bareCharacterName(character: Character): string {
    return character.name.split('/').at(-1) ?? '';
}

/** The width and height of the grid */
export const CharacterSize = 32;

/** The stroke width of highlights */
const SelectionStrokeWidth = 0.5;

/**
 *
 * @param character The character to render
 * @param size The CSS width and height of the SVG
 * @param selected An optional list of shapes that should have the class "selected"
 * @returns
 */
export function characterToSVG(
    character: Character,
    size: number | string,
    selection?: CharacterShape[],
    /** Whether the stage this is drawn on is having its colors flipped for a
     *  dark canvas. A character's explicit fills are creator colors like any
     *  other, so leaving them out would put the one bright thing on a dark
     *  stage. A `null` fill is `currentColor` and follows the phrase already. */
    adapting = false,
): string {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${CharacterSize} ${CharacterSize}">${character.shapes.map((s) => shapeToSVG(s, selection, adapting)).join('')}</svg>`;
}

export function unknownCharacterSVG(size: number | string) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${CharacterSize} ${CharacterSize}"><rect fill="none" stroke-width="3" stroke="currentColor" x="0" y="0" width="32" height="32" /></svg>`;
}

export function shapeToSVG(
    shape: CharacterShape,
    selection?: CharacterShape[],
    adapting = false,
): string {
    const selected = selection?.some((s) => s === shape);
    switch (shape.type) {
        case 'rect':
            return rectToSVG(shape, selected, adapting);
        case 'ellipse':
            return ellipseToSVG(shape, selected, adapting);
        case 'pixel':
            return pixelToSVG(shape, selected, adapting);
        case 'path':
            return pathToSVG(shape, selected, adapting);
        case 'glyph':
            return glyphToSVG(shape, selected, adapting);
    }
}

function rectToSVG(
    rect: CharacterRectangle,
    selected: boolean = false,
    adapting = false,
): string {
    const selectionStrokeWidth = Math.max(
        SelectionStrokeWidth,
        rect.stroke?.width ?? SelectionStrokeWidth,
    );
    return tag('rect', {
        x: rect.width < 0 ? rect.point.x + rect.width : rect.point.x,
        y: rect.height < 0 ? rect.point.y + rect.height : rect.point.y,
        width: Math.abs(rect.width),
        height: Math.abs(rect.height),
        rx: rect.corner,
        ry: rect.corner,
        fill: colorToSVG(rect.fill, adapting),
        stroke: rect.stroke
            ? colorToSVG(rect.stroke.color, adapting)
            : selected
              ? 'currentColor'
              : undefined,
        'stroke-width':
            rect.stroke?.width ?? (selected ? selectionStrokeWidth : undefined),
        'stroke-linecap': 'round',
        'stroke-dasharray': selected
            ? `${selectionStrokeWidth / 10},${selectionStrokeWidth}`
            : undefined,
        transform:
            rect.angle !== undefined
                ? `rotate(${rect.angle}, ${rect.point.x}, ${rect.point.y})`
                : undefined,
    });
}

function ellipseToSVG(
    ellipse: CharacterEllipse,
    selected: boolean = false,
    adapting = false,
): string {
    const selectionStrokeWidth = Math.max(
        SelectionStrokeWidth,
        ellipse.stroke?.width ?? SelectionStrokeWidth,
    );
    return tag('ellipse', {
        class: selected ? 'selected' : undefined,
        cx: ellipse.point.x + ellipse.width / 2,
        cy: ellipse.point.y + ellipse.height / 2,
        rx: Math.abs(ellipse.width / 2),
        ry: Math.abs(ellipse.height / 2),
        fill: colorToSVG(ellipse.fill, adapting),
        stroke: ellipse.stroke
            ? colorToSVG(ellipse.stroke.color, adapting)
            : selected
              ? 'currentColor'
              : undefined,
        'stroke-width':
            ellipse.stroke?.width ??
            (selected ? selectionStrokeWidth : undefined),
        'stroke-linecap': 'round',
        'stroke-dasharray': selected
            ? `${selectionStrokeWidth / 10},${selectionStrokeWidth}`
            : undefined,
        transform: ellipse.angle
            ? `rotate(${ellipse.angle}, ${ellipse.point.x}, ${ellipse.point.y})`
            : undefined,
    });
}

function pixelToSVG(
    pixel: CharacterPixel,
    selected: boolean = false,
    adapting = false,
): string {
    return tag('rect', {
        class: selected ? 'selected' : undefined,
        x: pixel.point.x,
        y: pixel.point.y,
        width: 1,
        height: 1,
        fill: colorToSVG(pixel.fill, adapting),
        stroke: selected ? 'currentColor' : undefined,
        'stroke-width': selected ? SelectionStrokeWidth : undefined,
    });
}

/** The segment arriving at a point: a quadratic curve if it has a control point, a line otherwise. */
function segmentToSVG({ x, y, curve }: PathPoint): string {
    return curve ? `Q ${curve.x} ${curve.y} ${x} ${y}` : `L ${x} ${y}`;
}

function pathToSVG(
    path: CharacterPath,
    selected: boolean = false,
    adapting = false,
): string {
    const [first, ...rest] = path.points;
    const points = [
        `${first.x} ${first.y}`,
        ...rest.map(segmentToSVG),
        // A closed path's final segment arrives back at the first point, so it's
        // the first point's control point that bends it.
        ...(path.closed ? [first.curve ? segmentToSVG(first) : ''] : []),
    ]
        .filter((segment) => segment !== '')
        .join(' ');

    const selectedStrokeWidth = Math.max(
        SelectionStrokeWidth,
        path.stroke?.width ?? SelectionStrokeWidth,
    );

    return tag('path', {
        class: selected ? 'selected' : undefined,
        d: `M ${points} ${path.closed ? 'Z' : ''}`,
        fill:
            path.fill === null
                ? 'currentColor'
                : path.fill !== undefined
                  ? fillToSVG(path.fill, adapting)
                  : 'none',
        stroke: path.stroke
            ? colorToSVG(path.stroke.color, adapting)
            : selected
              ? 'currentColor'
              : undefined,
        'stroke-width': selected ? selectedStrokeWidth : path.stroke?.width,
        'stroke-linecap': 'round',
        'stroke-dasharray': selected
            ? `${selectedStrokeWidth / 10},${selectedStrokeWidth}`
            : undefined,
        transform: path.angle
            ? `rotate(${path.angle}, ${path.points.reduce((sum, x) => sum + x.x, 0) / path.points.length}, ${path.points.reduce((sum, x) => sum + x.y, 0) / path.points.length})`
            : undefined,
    });
}

/**
 * Render a traced glyph.
 *
 * `d` lives in the unit box, so everything that positions it is a transform:
 * scale it to the shape's box, rotate about the box's own center, then move it
 * to `point`. SVG applies a transform list right to left, which is why they are
 * written in that order.
 *
 * `vector-effect="non-scaling-stroke"` is what keeps `stroke.width` meaning the
 * same thing here as on every other shape — without it the scale that sizes the
 * glyph would multiply the stroke too, and the shared stroke-width slider would
 * do something different depending on which shape was selected.
 */
function glyphToSVG(
    glyph: CharacterGlyph,
    selected: boolean = false,
    adapting = false,
): string {
    const selectionStrokeWidth = Math.max(
        SelectionStrokeWidth,
        glyph.stroke?.width ?? SelectionStrokeWidth,
    );
    return tag('path', {
        class: selected ? 'selected' : undefined,
        d: glyph.d,
        fill: colorToSVG(glyph.fill, adapting),
        stroke: glyph.stroke
            ? colorToSVG(glyph.stroke.color, adapting)
            : selected
              ? 'currentColor'
              : undefined,
        'stroke-width':
            glyph.stroke?.width ??
            (selected ? selectionStrokeWidth : undefined),
        'vector-effect': 'non-scaling-stroke',
        'stroke-linecap': 'round',
        'stroke-dasharray': selected
            ? `${selectionStrokeWidth / 10},${selectionStrokeWidth}`
            : undefined,
        // A mirrored glyph scales by a negative width, and the extra translate
        // puts the reflected box back where the unreflected one was, so the
        // shape still occupies point..point+width.
        transform:
            `translate(${glyph.point.x + (glyph.mirrored ? glyph.width : 0)} ${glyph.point.y})` +
            (glyph.angle
                ? ` rotate(${glyph.angle} ${(glyph.mirrored ? -glyph.width : glyph.width) / 2} ${glyph.height / 2})`
                : '') +
            ` scale(${glyph.mirrored ? -glyph.width : glyph.width} ${glyph.height})`,
    });
}

function colorToSVG(
    fill: Color | undefined | null,
    adapting = false,
): string | undefined {
    return fill === null
        ? 'currentColor'
        : fill
          ? fillToSVG(fill, adapting)
          : 'none';
}

/** The one place a character's LCH fill becomes CSS, so the adapt flag can't
 *  be applied to some of a character's shapes and not others. */
function fillToSVG(fill: Color, adapting: boolean): string {
    return LCHtoRGB(adapting ? adaptLightness(fill.l) : fill.l, fill.c, fill.h);
}

function tag(
    name: string,
    attrs: Record<string, string | number | undefined>,
): string {
    return `<${name} ${Object.entries(attrs)
        // Skip fields with undefined values.
        .map(([k, v]) => (v === undefined ? undefined : `${k}="${v}"`))
        .filter((pair) => pair !== undefined)
        .join(' ')}/>`;
}

export function pixelsAreEqual(
    one: CharacterPixel,
    two: CharacterPixel,
): boolean {
    return (
        one.point.x === two.point.x &&
        one.point.y === two.point.y &&
        ((!('fill' in one) && !('fill' in two)) ||
            (one.fill === null && two.fill === null) ||
            (one.fill !== null &&
                two.fill !== null &&
                one.fill.l === two.fill.l &&
                one.fill.c === two.fill.c &&
                one.fill.h === two.fill.h))
    );
}

export function colorsAreEqual(
    one: Color | null | undefined,
    two: Color | null | undefined,
): boolean {
    return (
        (one === null && two === null) ||
        (one == undefined && two === undefined) ||
        (!!one &&
            !!two &&
            one.l === two.l &&
            one.c === two.c &&
            one.h === two.h)
    );
}

export function getSharedColor(
    colors: (Color | null | undefined)[],
): Color | null | undefined {
    const first = colors[0];
    const rest = colors.slice(1);
    if (first == undefined) return undefined;
    if (rest.length === 0) return first;
    else return rest.every((c) => colorsAreEqual(first, c)) ? first : undefined;
}

export function getPathCenter(path: CharacterPath): Point {
    // Compute the center
    const center = path.points.reduce(
        (sum, { x, y }) => ({ x: sum.x + x, y: sum.y + y }),
        { x: 0, y: 0 },
    );
    // Divide by the number of points to get the center
    center.x /= path.points.length;
    center.y /= path.points.length;
    return center;
}

/**
 * The point `moveShape(…, 'move')` puts where you tell it — a path's center, and
 * every other shape's own point.
 *
 * Exported so a caller computing drag offsets doesn't have to switch on the
 * shape kind: doing that by hand meant a kind with no case (glyphs) contributed
 * no offset at all, which both stopped it dragging and misaligned the offsets of
 * every shape after it in a mixed selection.
 */
export function getShapeAnchor(shape: CharacterShape): Point {
    // A copy, not the shape's own point: getPathCenter already returns a fresh
    // one, and handing out a live reference for the other kinds would let a
    // caller move a shape by writing to what looks like a reading.
    return shape.type === 'path' ? getPathCenter(shape) : { ...shape.point };
}

/** Mutate the given shape in the specified direction. If set is true, interpret the position as a new location, otherwise interpret it is a translation. */
export function moveShape(
    shape: CharacterShape,
    x: number,
    y: number,
    set: 'move' | 'translate',
) {
    switch (shape.type) {
        // These four are easy: one corner carries the whole shape.
        case 'rect':
        case 'ellipse':
        case 'pixel':
        case 'glyph':
            if (set == 'move') {
                shape.point.x = x;
                shape.point.y = y;
            } else {
                shape.point.x += x;
                shape.point.y += y;
            }
            break;
        // This one requires moving all the points.
        case 'path':
            if (shape.type === 'path') {
                // Compute the center
                const center = shape.points.reduce(
                    (sum, { x, y }) => ({ x: sum.x + x, y: sum.y + y }),
                    { x: 0, y: 0 },
                );
                // Divide by the number of points to get the center
                center.x /= shape.points.length;
                center.y /= shape.points.length;

                for (const point of shape.points) {
                    // A control point rides with the segment it bends; left
                    // behind, the curve would deform as the path moved.
                    for (const p of point.curve
                        ? [point, point.curve]
                        : [point])
                        if (set === 'move') {
                            p.x = x + (p.x - center.x);
                            p.y = y + (p.y - center.y);
                        } else {
                            p.x += x;
                            p.y += y;
                        }
                }
            }
    }
}

/** A path's points, which the schema requires to be non-empty. */
export type PathPoints = CharacterPath['points'];
