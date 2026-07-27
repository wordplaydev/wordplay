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
        return locales.getPlainText((l) => getFirstText(l.output.Circle.names));
    }
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
