/**
 * This file contains type definitions and functionality for managing custom glyphs, which are rendered as SVGs.
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

const PositionSchema = z.array(z.number()).nonempty().length(2);
type Postion = z.infer<typeof PositionSchema>;

const SizeSchema = z.object({
    width: z.number(),
    height: z.number(),
});
type Size = z.infer<typeof SizeSchema>;

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
type Stroke = z.infer<typeof StrokeSchema>;

const RectangleSchema = z
    .object({
        type: z.literal('rect'),
        center: PositionSchema, // The center of the rectangle
        angle: z.number().optional(),
        stroke: StrokeSchema.optional(),
        // Null represents current color
        fill: ColorSchema.optional().nullable(),
        corner: z.number().optional(),
    })
    // The width and height of the rectange.
    .merge(SizeSchema);

type Rectangle = z.infer<typeof RectangleSchema>;

const PixelSchema = z.object({
    type: z.literal('pixel'),
    point: PositionSchema, // The center of the pixel
    fill: ColorSchema.nullable(), // It's fill color, no stroke
});
type Pixel = z.infer<typeof PixelSchema>;

const EllipseSchema = z
    .object({
        type: z.literal('ellipse'),
        center: PositionSchema,
        stroke: StrokeSchema.optional(),
        fill: ColorSchema.optional().nullable(),
        angle: z.number().optional(), // degrees
    })
    // The radius on each dimension
    .merge(SizeSchema);

type Ellipse = z.infer<typeof EllipseSchema>;

const PathSchema = z.object({
    type: z.literal('path'),
    stroke: StrokeSchema.optional(),
    // Null represents current color
    fill: ColorSchema.optional().nullable(),
    // A series of positions defining the path.
    points: z.array(PositionSchema).nonempty(),
    angle: z.number().optional(), // degrees rotated around the center
    // Whether the path is closed by connecting the last point to the first
    closed: z.boolean(),
    // Whether the path is curved. If it is, we treat all points as quadratic Béziers, with control points inferred.
    // See: https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths
    curved: z.boolean(),
});
type Path = z.infer<typeof PathSchema>;

export type Shape = Rectangle | Ellipse | Pixel | Path;

/** A 128x128 pixel canvas of layered shapes */
export type Glyph = {
    name: string; // A language tagged name in Wordplay syntax
    description: string; // A language tagged name in Wordplay syntax
    shapes: Shape[]; // In rendering order, back to front
};

/** The width and height of the grid */
export const GlyphSize = 32;

export function glyphToSVG(glyph: Glyph, size: number): string {
    return `<svg width=${size} height=${size} viewBox="0 0 ${GlyphSize} ${GlyphSize}">${glyph.shapes.map((s) => shapeToSVG(s))}</svg>`;
}

function shapeToSVG(shape: Shape): string {
    switch (shape.type) {
        case 'rect':
            return rectToSVG(shape);
        case 'ellipse':
            return ellipseToSVG(shape);
        case 'pixel':
            return pixelToSVG(shape);
        case 'path':
            return pathToSVG(shape);
    }
}

function rectToSVG(rect: Rectangle): string {
    return tag('rect', {
        x: rect.center[0] - rect.width / 2,
        y: rect.center[1] - rect.height / 2,
        width: rect.width,
        height: rect.height,
        rx: rect.corner,
        ry: rect.corner,
        fill: colorToSVG(rect.fill),
        stroke: rect.stroke ? colorToSVG(rect.stroke.color) : undefined,
        'stroke-width': rect.stroke?.width,
        'stroke-linecap': 'round',
        transform: rect.angle
            ? `rotate(${rect.angle}, ${rect.center[0]}, ${rect.center[1]})`
            : undefined,
    });
}

function ellipseToSVG(ellipse: Ellipse): string {
    return tag('ellipse', {
        cx: ellipse.center[0],
        cy: ellipse.center[1],
        rx: ellipse.width / 2,
        ry: ellipse.height / 2,
        fill: colorToSVG(ellipse.fill),
        stroke: ellipse.stroke ? colorToSVG(ellipse.stroke.color) : undefined,
        'stroke-width': ellipse.stroke?.width,
        'stroke-linecap': 'round',
        transform: ellipse.angle
            ? `rotate(${ellipse.angle}, ${ellipse.center[0]}, ${ellipse.center[1]})`
            : undefined,
    });
}

function pixelToSVG(pixel: Pixel): string {
    return tag('rect', {
        x: pixel.point[0],
        y: pixel.point[1],
        width: 1,
        height: 1,
        fill: colorToSVG(pixel.fill),
    });
}

function pathToSVG(path: Path): string {
    const points = path.points
        .map(
            ([x, y], index) =>
                `${index > 0 ? (path.curved ? 'T' : 'L') : ''} ${x} ${y}`,
        )
        .join(' ');

    return tag('path', {
        d: `M ${points} ${path.closed ? 'Z' : ''}`,
        fill:
            path.fill === null
                ? 'currentColor'
                : path.fill !== undefined
                  ? LCHtoRGB(path.fill.l, path.fill.c, path.fill.h)
                  : undefined,
        stroke: path.stroke ? colorToSVG(path.stroke.color) : undefined,
        'stroke-width': path.stroke?.width,
        'stroke-linecap': 'round',
        transform: path.angle
            ? `rotate(${path.angle}, ${path.points.reduce((sum, x) => sum + x[0], 0) / path.points.length}, ${path.points.reduce((sum, x) => sum + x[1], 0) / path.points.length}`
            : undefined,
    });
}

function colorToSVG(fill: Color | undefined | null): string {
    return fill === null
        ? 'currentColor'
        : fill !== undefined
          ? LCHtoRGB(fill.l, fill.c, fill.h)
          : 'currentColor';
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
