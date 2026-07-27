import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import { getFirstText } from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import { toNumber } from '@output/Output/Stage';
import { getOutputInputs } from '@output/Output/Valued';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import { Form } from '@output/Output/Shape/Form';

export function createPolygonType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Polygon, TYPE_SYMBOL)} Form (
        ${getBind(locales, (locale) => locale.output.Polygon.radius)}•#m
        ${getBind(locales, (locale) => locale.output.Polygon.sides)}•#
        ${getBind(locales, (locale) => locale.output.Polygon.x)}•#m: 0m
        ${getBind(locales, (locale) => locale.output.Polygon.y)}•#m: 0m
        ${getBind(locales, (locale) => locale.output.Polygon.z)}•#m: 0m
    )
`);
}

export class Polygon extends Form {
    readonly radius: number;
    readonly sides: number;
    readonly x: number;
    readonly y: number;
    readonly z: number;

    constructor(
        value: Value,
        radius: number,
        sides: number,
        x: number,
        y: number,
        z: number,
    ) {
        super(value);

        this.radius = Math.abs(radius);
        // Round a fractional side count, and clamp to a minimum of 3 — fewer than three sides is a
        // degenerate (point/line) polygon that draws nothing, so treat it as a triangle.
        this.sides = Math.max(3, Math.round(Math.abs(sides)));
        this.x = x;
        this.y = y;
        this.z = z;
    }

    getLeft() {
        return this.x - this.radius;
    }

    getTop() {
        return this.y + this.radius;
    }

    getZ() {
        return this.z;
    }

    getWidth() {
        return this.radius * 2;
    }

    getHeight() {
        return this.radius * 2;
    }

    /** Compute regular polygon coordinates based on x, y, radius, and sides */
    getCoordinates() {
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < this.sides; i++) {
            points.push({
                x:
                    PX_PER_METER *
                    (this.x +
                        this.radius * Math.cos((2 * Math.PI * i) / this.sides) -
                        this.getLeft()),
                y:
                    -PX_PER_METER *
                    (this.y +
                        this.radius * Math.sin((2 * Math.PI * i) / this.sides) -
                        this.getTop()),
            });
        }

        return points;
    }

    toCSSClip() {
        const points = this.getCoordinates();
        return `polygon(${points.map((p) => `${p.x}px ${p.y}px`).join(', ')})`;
    }

    toSVGPath(x: number, y: number) {
        const points = this.getCoordinates();
        return `M ${points.map((p) => `${p.x + x},${p.y + y}`).join(' ')} Z`;
    }

    getDescription(locales: Locales): string {
        return locales.getPlainText((l) =>
            getFirstText(l.output.Polygon.names),
        );
    }
}

export function toPolygon(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;

    const [radiusVal, sidesVal, xVal, yVal, zVal] = getOutputInputs(value);

    const radius = toNumber(radiusVal);
    const sides = toNumber(sidesVal);
    const x = toNumber(xVal);
    const y = toNumber(yVal);
    const z = toNumber(zVal) ?? 0;
    return x !== undefined &&
        y !== undefined &&
        radius !== undefined &&
        sides !== undefined
        ? new Polygon(value, radius, sides, x, y, z)
        : undefined;
}
