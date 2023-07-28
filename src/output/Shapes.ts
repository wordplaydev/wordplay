import toStructure from '../native/toStructure';
import { TYPE_SYMBOL } from '../parser/Symbols';
import Structure from '../runtime/Structure';
import type Value from '../runtime/Value';
import { getBind } from '../locale/getBind';
import { toNumber } from './Stage';
import { PX_PER_METER } from './outputToCSS';
import type Locale from '../locale/Locale';
import { getOutputInputs } from './Output';

export function createShapeType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Shape, TYPE_SYMBOL)}()
`);
}

export function createRectangleType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Rectangle, '•')} Shape(
        ${getBind(locales, (locale) => locale.output.Rectangle.left)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.top)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.right)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.bottom)}•#m
    )
`);
}

export abstract class Shape {
    constructor() {}

    /** Should return a valid CSS clip-path value */
    abstract toCSSClip(): string;
    abstract toSVGPath(): string;
    abstract getLeft(): number;
    abstract getTop(): number;
    abstract getWidth(): number;
    abstract getHeight(): number;
}

export class Rectangle extends Shape {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;

    constructor(left: number, top: number, right: number, bottom: number) {
        super();

        this.left = left;
        this.top = top;
        this.right = right;
        this.bottom = bottom;
    }

    getLeft() {
        return this.left * PX_PER_METER;
    }

    getTop() {
        return -this.top * PX_PER_METER;
    }

    getPoints() {
        const left = this.getLeft();
        const top = this.getTop();
        const right = this.right * PX_PER_METER;
        const bottom = -this.bottom * PX_PER_METER;
        return { left, top, right, bottom };
    }

    toCSSClip() {
        const { left, top, right, bottom } = this.getPoints();
        return `polygon(${left}px ${top}px, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px)`;
    }

    toSVGPath() {
        const { left, top, right, bottom } = this.getPoints();
        const minX = Math.min(left, right);
        const minY = Math.min(top, bottom);
        return `M ${left - minX} ${top - minY} L ${left - minX} ${
            bottom - minY
        } L ${right - minX} ${bottom - minY} L ${right - minX} ${top - minY} Z`;
    }

    getWidth() {
        const { left, right } = this.getPoints();
        return Math.abs(left - right);
    }

    getHeight() {
        const { top, bottom } = this.getPoints();
        return Math.abs(bottom - top);
    }
}

export function toShape(value: Value | undefined) {
    if (!(value instanceof Structure)) return undefined;

    const [leftVal, topVal, rightVal, bottomVal] = getOutputInputs(value);

    const left = toNumber(leftVal);
    const top = toNumber(topVal);
    const right = toNumber(rightVal);
    const bottom = toNumber(bottomVal);
    return left !== undefined &&
        top !== undefined &&
        right !== undefined &&
        bottom !== undefined
        ? new Rectangle(left, top, right, bottom)
        : undefined;
}
