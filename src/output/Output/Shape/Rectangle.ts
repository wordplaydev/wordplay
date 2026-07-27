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
        return locales.getPlainText((l) =>
            getFirstText(l.output.Rectangle.names),
        );
    }
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
