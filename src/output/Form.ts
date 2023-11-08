import { getFirstName } from '../locale/Locale';
import type Locales from '../locale/Locales';
import StructureValue from '../values/StructureValue';
import type Value from '../values/Value';
import { toNumber } from './Stage';
import Valued, { getOutputInputs } from './Valued';
import { PX_PER_METER } from './outputToCSS';

/** This is a wrapper class for a Form value, which represents some kind of shape that's used as a collision boundary. */
export abstract class Form extends Valued {
    /** Should return a valid CSS clip-path value, used as a clip-path in Stage. */
    abstract toCSSClip(): string;
    /** Used to create a border when a StageView is clipped. Should mirror the clip-path value. */
    abstract toSVGPath(): string;
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
        z: number
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

    toSVGPath() {
        const { left, top, right, bottom } = this.getPoints();
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

export function toRectangle(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;

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
