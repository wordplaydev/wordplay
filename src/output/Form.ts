import type Project from '@models/Project';
import { getFirstName } from '../locale/Locale';
import type Locales from '../locale/Locales';
import StructureValue from '../values/StructureValue';
import type Value from '../values/Value';
import { toNumber } from './Stage';
import Valued, { getOutputInputs } from './Valued';
import { PX_PER_METER } from './outputToCSS';
import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';

/** This is a wrapper class for a Form value, which represents some kind of shape that's used as a collision boundary. */
export abstract class Form extends Valued {
    /** Should return a valid CSS clip-path value, used as a clip-path in GroupView and ShapeView. */
    abstract toCSSClip(): string;
    /** Used to create a border when a StageView is clipped. Should mirror the clip-path value. */
    abstract toSVGPath(x: number, y: number): string;
    /**
     * The left coordinate of the top left of the rectangular bounding box for the shape, regardless of it's shape.
     * Used to position the clip frame of the Stage, to define the rectangular border in the Physics engine, and to determine
     * the placement of Shapes on stage.
     **/
    abstract getLeft(): number;
    /** The top coordinate of the top left of the rectangular bounding box for the shape. See getLeft() for its uses.  */
    abstract getTop(): number;
    /** The z-coordinate of the shape on Stage. */
    abstract getZ(): number;
    /**
     * The width of the rectangular bounding box for the shape, regardless of it's shape.
     * Determines the width of the clip SVG when used as a frame, and the width of the collision boundary in the physics engine.
     **/
    abstract getWidth(): number;
    /**
     * The height of the rectangular bounding box for the shape, regardless of it's shape.
     * Determines the height of the clip SVG when used as a frame, and the height of the collision boundary in the physics engine.
     **/
    abstract getHeight(): number;
    /** Given preferred locales, a description of the shape for screen readers to read. */
    abstract getDescription(locales: Locales): string;
}

export function createFormType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Form, TYPE_SYMBOL)}()
`);
}

export function createRectangleType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Rectangle, TYPE_SYMBOL)} Form (
        ${getBind(locales, (locale) => locale.output.Rectangle.left)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.top)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.right)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.bottom)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.z)}•#m: 0m
    )
`);
}

export class Rectangle extends Form {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly z: number;

    constructor(
        value: Value,
        left: number,
        top: number,
        right: number,
        bottom: number,
        z: number,
    ) {
        super(value);

        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
        this.z = z;
    }

    getLeft() {
        return Math.min(this.left, this.right);
    }

    getTop() {
        return Math.max(this.top, this.bottom);
    }

    getZ() {
        return this.z;
    }

    getWidth() {
        return Math.abs(this.left - this.right);
    }

    getHeight() {
        return Math.abs(this.bottom - this.top);
    }

    getPoints() {
        const left = this.getLeft() * PX_PER_METER;
        const top = -this.getTop() * PX_PER_METER;
        const right = (this.getLeft() + this.getWidth()) * PX_PER_METER;
        const bottom = -(this.getTop() - this.getHeight()) * PX_PER_METER;
        return { left, top, right, bottom };
    }

    toCSSClip() {
        const { left, top, right, bottom } = this.getPoints();
        return `polygon(${left}px ${top}px, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px)`;
    }

    toSVGPath(x: number, y: number) {
        let { left, top, right, bottom } = this.getPoints();
        left += x;
        top += y;
        right += x;
        bottom += y;
        const minX = Math.min(left, right);
        const minY = Math.min(top, bottom);
        return `M ${left - minX} ${top - minY} L ${left - minX} ${
            bottom - minY
        } L ${right - minX} ${bottom - minY} L ${right - minX} ${top - minY} Z`;
    }

    getDescription(locales: Locales): string {
        return locales.get((l) => getFirstName(l.output.Rectangle.names));
    }
}

export function createCircleType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Circle, TYPE_SYMBOL)} Form (
        ${getBind(locales, (locale) => locale.output.Circle.radius)}•#m
        ${getBind(locales, (locale) => locale.output.Circle.x)}•#m: 0m
        ${getBind(locales, (locale) => locale.output.Circle.y)}•#m: 0m
        ${getBind(locales, (locale) => locale.output.Circle.z)}•#m: 0m
    )
`);
}

export class Circle extends Form {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly radius: number;

    constructor(value: Value, x: number, y: number, z: number, radius: number) {
        super(value);

        this.x = x;
        this.y = y;
        this.z = z;
        this.radius = Math.abs(radius);
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

    getCoordinates() {
        return {
            x: (this.x - this.getLeft()) * PX_PER_METER,
            y: -(this.y - this.getTop()) * PX_PER_METER,
            radius: this.radius * PX_PER_METER,
        };
    }

    toCSSClip() {
        const { x, y, radius } = this.getCoordinates();
        return `circle(${radius}px at ${y}px ${x}px)`;
    }

    toSVGPath(offsetX: number, offsetY: number) {
        const { x, y, radius } = this.getCoordinates();
        const newX = x + offsetX;
        const newY = y + offsetY;
        return `M ${newX} ${newY} m ${radius}, 0
        a ${radius},${radius} 0 1,0 ${-radius * 2},0
        a ${radius},${radius} 0 1,0 ${radius * 2},0`;
    }

    getDescription(locales: Locales): string {
        return locales.get((l) => getFirstName(l.output.Circle.names));
    }
}

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
        this.sides = Math.floor(Math.abs(sides));
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
        return locales.get((l) => getFirstName(l.output.Polygon.names));
    }
}

export function toForm(
    project: Project,
    value: Value | undefined,
): Form | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    if (value.is(project.shares.output.Rectangle)) return toRectangle(value);
    else if (value.is(project.shares.output.Circle)) return toCircle(value);
    else if (value.is(project.shares.output.Polygon)) return toPolygon(value);
    else return undefined;
}

export function toRectangle(value: StructureValue) {
    const [leftVal, topVal, rightVal, bottomVal, zVal] = getOutputInputs(value);

    const left = toNumber(leftVal);
    const top = toNumber(topVal);
    const right = toNumber(rightVal);
    const bottom = toNumber(bottomVal);
    const z = toNumber(zVal) ?? 0;
    return left !== undefined &&
        top !== undefined &&
        right !== undefined &&
        bottom !== undefined
        ? new Rectangle(value, left, top, right, bottom, z)
        : undefined;
}

export function toCircle(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;

    const [radiusVal, xVal, yVal, zVal] = getOutputInputs(value);

    const radius = toNumber(radiusVal);
    const x = toNumber(xVal);
    const y = toNumber(yVal);
    const z = toNumber(zVal) ?? 0;
    return x !== undefined && y !== undefined && radius !== undefined
        ? new Circle(value, x, y, z, radius)
        : undefined;
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
