import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type Locales from '@locale/Locales';
import Valued from '@output/Output/Valued';

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
