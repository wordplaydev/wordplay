import { getFirstName } from '../locale/Locale';
import type Locales from '../locale/Locales';
import StructureValue from '../values/StructureValue';
import type Value from '../values/Value';
// import type Color from './Color';
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
        // color: Color, 
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

export class Line extends Form {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly z: number;
    
    constructor(
        value: Value,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        z: number
    ) {
        super(value);

        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.z = z;
    }

    getLeft() {
        return this.x1;
    }

    getTop() {
        
        return this.y1;
    }

    getZ() {
        return this.z;
    }

    getWidth() {
        // console.log(this.x2 - this.x1);
        return (this.x2 - this.x1);
    }

    getHeight() {
        // console.log(this.y2 - this.y1);
        return (this.y2 - this.y1);
    }

    getPoints() {
        const x1 = this.getLeft() * PX_PER_METER;
        const y1 = -this.getTop() * PX_PER_METER;
        const x2 = (this.getLeft() + this.getWidth()) * PX_PER_METER;
        let y2;
        if (this.y1 > this.y2) {
            y2 = (this.getTop() - this.getHeight()) * PX_PER_METER;
        } else {
            y2 = (this.getTop() + this.getHeight()) * PX_PER_METER;
        }
        return { x1, y1, x2, y2 };
    }

    toCSSClip() {
        const { x1, y1, x2, y2 } = this.getPoints();
        return `polygon(${x1}px ${y1}px, ${x2}px ${y2}px, ${x1 - 5}px ${y1 + 5}px, ${x2 - 5}px ${y2 + 5}px)`;
    }

    toSVGPath() {
    const { x1, y1, x2, y2 } = this.getPoints();
    return `M ${x1} ${y1} L ${x2} ${y2}`;
}


    getLength() {
        return Math.sqrt(Math.pow(this.x2 - this.x1, 2) + Math.pow(this.y2 - this.y1, 2));
    }

    getDescription(locales: Locales): string {
        return locales.get((l) => getFirstName(l.output.Line.names));
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

export function toLine(value: Value | undefined) {
    if (!(value instanceof StructureValue)) return undefined;

    const [x1Val, y1Val, x2Val, y2Val, zVal] = getOutputInputs(value);

    const x1 = toNumber(x1Val);
    const y1 = toNumber(y1Val);
    const x2 = toNumber(x2Val);
    const y2 = toNumber(y2Val);
    const z = toNumber(zVal) ?? 0;
    return x1 !== undefined &&
        y1 !== undefined &&
        x2 !== undefined &&
        y2 !== undefined
        ? new Line(value, x1, y1, x2, y2, z)
        : undefined;
}