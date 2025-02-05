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
import { LCHtoRGB } from '@output/Color';
import z from 'zod';

const PointSchema = z.object({ x: z.number(), y: z.number() });
type Point = z.infer<typeof PointSchema>;

const SizeSchema = z.object({
    width: z.number(),
    height: z.number(),
});

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
        angle: z.number().optional(),
        stroke: StrokeSchema.optional(),
        // Null represents current color
        fill: ColorSchema.optional().nullable(),
        corner: z.number().optional(),
    })
    // The width and height of the rectange.
    .merge(SizeSchema);

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
        stroke: StrokeSchema.optional(),
        fill: ColorSchema.optional().nullable(),
        angle: z.number().optional(), // degrees
    })
    // The radius on each dimension
    .merge(SizeSchema);

export type CharacterEllipse = z.infer<typeof EllipseSchema>;

const PathSchema = z.object({
    type: z.literal('path'),
    stroke: StrokeSchema.optional(),
    // Null represents current color
    fill: ColorSchema.optional().nullable(),
    // A series of positions defining the path.
    points: z.array(PointSchema).nonempty(),
    angle: z.number().optional(), // degrees rotated around the center
    // Whether the path is closed by connecting the last point to the first
    closed: z.boolean(),
});
export type CharacterPath = z.infer<typeof PathSchema>;

const CharacterShapeSchema = z.union([
    PixelSchema,
    RectangleSchema,
    EllipseSchema,
    PathSchema,
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
    // The Unix time of when this was last updated, for simple distributed conflict resolution.
    updated: z.number(),
    // owner username/Wordplay name (e.g., "hello/FunnyAnimal")
    name: z.string(),
    // A list of tagged names in Wordplay syntax
    description: z.string(),
    // In rendering order, back to front
    shapes: z.array(
        z.union([PixelSchema, RectangleSchema, EllipseSchema, PathSchema]),
    ),
});
export type Character = z.infer<typeof CharacterSchema>;

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
): string {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${CharacterSize} ${CharacterSize}">${character.shapes.map((s) => shapeToSVG(s, selection)).join('')}</svg>`;
}

export function unknownCharacterSVG(size: number | string) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${CharacterSize} ${CharacterSize}"><rect fill="none" stroke-width="3" stroke="currentColor" x="0" y="0" width="32" height="32" /></svg>`;
}

export function shapeToSVG(
    shape: CharacterShape,
    selection?: CharacterShape[],
): string {
    const selected = selection?.some((s) => s === shape);
    switch (shape.type) {
        case 'rect':
            return rectToSVG(shape, selected);
        case 'ellipse':
            return ellipseToSVG(shape, selected);
        case 'pixel':
            return pixelToSVG(shape, selected);
        case 'path':
            return pathToSVG(shape, selected);
    }
}

function rectToSVG(
    rect: CharacterRectangle,
    selected: boolean = false,
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
        fill: colorToSVG(rect.fill),
        stroke: rect.stroke
            ? colorToSVG(rect.stroke.color)
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
            'angle' in rect
                ? `rotate(${rect.angle}, ${rect.point.x}, ${rect.point.y})`
                : undefined,
    });
}

function ellipseToSVG(
    ellipse: CharacterEllipse,
    selected: boolean = false,
): string {
    const selectionStrokeWidth = Math.max(
        SelectionStrokeWidth,
        ellipse.stroke?.width ?? SelectionStrokeWidth,
    );
    return tag('ellipse', {
        class: selected ? 'selected' : undefined,
        cx:
            (ellipse.width < 0
                ? ellipse.point.x + ellipse.width / 2
                : ellipse.point.x) +
            ellipse.width / 2,
        cy:
            (ellipse.height < 0
                ? ellipse.point.y + ellipse.height / 2
                : ellipse.point.y) +
            ellipse.height / 2,
        rx: Math.abs(ellipse.width / 2),
        ry: Math.abs(ellipse.height / 2),
        fill: colorToSVG(ellipse.fill),
        stroke: ellipse.stroke
            ? colorToSVG(ellipse.stroke.color)
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

function pixelToSVG(pixel: CharacterPixel, selected: boolean = false): string {
    return tag('rect', {
        class: selected ? 'selected' : undefined,
        x: pixel.point.x,
        y: pixel.point.y,
        width: 1,
        height: 1,
        fill: colorToSVG(pixel.fill),
        stroke: selected ? 'currentColor' : undefined,
        'stroke-width': selected ? SelectionStrokeWidth : undefined,
    });
}

function pathToSVG(path: CharacterPath, selected: boolean = false): string {
    const points = path.points
        .map(({ x, y }, index) => `${index > 0 ? 'L' : ''} ${x} ${y}`)
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
                  ? LCHtoRGB(path.fill.l, path.fill.c, path.fill.h)
                  : 'none',
        stroke: path.stroke
            ? colorToSVG(path.stroke.color)
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

function colorToSVG(fill: Color | undefined | null): string | undefined {
    return fill === null
        ? 'currentColor'
        : fill
          ? LCHtoRGB(fill.l, fill.c, fill.h)
          : 'none';
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

/** Mutate the given shape in the specified direction. If set is true, interpret the position as a new location, otherwise interpret it is a translation. */
export function moveShape(
    shape: CharacterShape,
    x: number,
    y: number,
    set: 'move' | 'translate',
) {
    switch (shape.type) {
        // These three are easy.
        case 'rect':
        case 'ellipse':
        case 'pixel':
            if (set == 'move') {
                shape.point.x = x;
                shape.point.y = y;
            } else {
                shape.point.x += x;
                shape.point.y += y;
            }
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
                    if (set === 'move') {
                        point.x = x + (point.x - center.x);
                        point.y = y + (point.y - center.y);
                    } else {
                        point.x += x;
                        point.y += y;
                    }
                }
            }
    }
}
