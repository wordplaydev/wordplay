import toStructure from '@basis/toStructure';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import type Color from './Color';
import Valued, { getOutputInputs } from './Valued';
import type Place from './Place';
import { toPlace } from './Place';
import { toBoolean, toNumber } from './Stage';
import { toColor } from './Color';
import { getBind } from '@locale/getBind';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';
import type Project from '../models/Project';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export function createPoseType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Pose, '•')}(
        ${getBind(locales, (locale) => locale.output.Pose.color)}•Color|ø: ø
        ${getBind(locales, (locale) => locale.output.Pose.opacity)}•%|ø: ø
        ${getBind(locales, (locale) => locale.output.Pose.offset)}•Place|ø: ø
        ${getBind(locales, (locale) => locale.output.Pose.rotation)}•#°|ø: ø
        ${getBind(locales, (locale) => locale.output.Pose.scale)}•#|ø: ø
        ${getBind(locales, (locale) => locale.output.Pose.flipx)}•?|ø: ø
        ${getBind(locales, (locale) => locale.output.Pose.flipy)}•?|ø: ø
    )
`);
}

export default class Pose extends Valued {
    readonly color?: Color;
    readonly opacity?: number;
    readonly offset?: Place;
    readonly rotation?: number;
    readonly scale?: number;
    readonly flipx?: boolean;
    readonly flipy?: boolean;
    readonly blur?: number;

    private _description: string | undefined = undefined;

    constructor(
        value: Value,
        color?: Color,
        opacity?: number,
        offset?: Place,
        rotation?: number,
        scale?: number,
        flipx?: boolean,
        flipy?: boolean,
    ) {
        super(value);

        this.color = color;
        this.opacity = opacity;
        this.offset = offset;
        this.rotation = rotation;
        this.scale = scale;
        this.flipx = flipx;
        this.flipy = flipy
    }

    /** Override non-empty values with the values in the given pose */
    with(pose: Pose) {
        return new Pose(
            pose.value,
            pose.color ?? this.color,
            pose.opacity ?? this.opacity,
            pose.offset ?? this.offset,
            pose.rotation ?? this.rotation,
            pose.scale ?? this.scale,
            pose.flipx ?? this.flipx,
            pose.flipy ?? this.flipy,
        );
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            this._description = concretize(
                locales,
                locales.get((l) => l.output.Pose.description),
                this.opacity !== undefined && this.opacity !== 1
                    ? Math.round(this.opacity)
                    : undefined,
                this.rotation !== undefined && this.rotation % 360
                    ? Math.round(this.rotation)
                    : undefined,
                this.scale !== undefined && this.scale !== 1
                    ? Math.round(this.scale)
                    : undefined,
                this.flipx,
                this.flipy,
            ).toText();
        }
        return this._description;
    }

    /** True if this pose's values equal the given pose's. */
    equals(pose: Pose) {
        return (
            ((this.color === undefined && pose.color === undefined) ||
                (this.color !== undefined &&
                    pose.color !== undefined &&
                    this.color.equals(pose.color))) &&
            this.opacity === pose.opacity &&
            ((this.offset === undefined && pose.offset === undefined) ||
                (this.offset !== undefined &&
                    pose.offset !== undefined &&
                    this.offset.equals(pose.offset))) &&
            this.rotation === pose.rotation &&
            this.scale === pose.scale &&
            this.flipx === pose.flipx &&
            this.flipy === pose.flipy
        );
    }
}

export class DefinitePose extends Pose {
    constructor(
        value: Value,
        color: Color | undefined,
        opacity: number | undefined,
        offset: Place | undefined,
        rotation: number | undefined,
        scale: number | undefined,
        flipx: boolean | undefined,
        flipy: boolean | undefined,
    ) {
        super(value, color, opacity, offset, rotation, scale, flipx, flipy);
    }
}

export function toPose(
    project: Project,
    value: Value | undefined,
): Pose | undefined {
    if (
        !(
            value instanceof StructureValue &&
            value.type === project.shares.output.Pose
        )
    )
        return undefined;

    const [color, opacity, offset, tilt, scale, flipx, flipy] =
        getOutputInputs(value);

    return new Pose(
        value,
        toColor(color),
        toNumber(opacity),
        toPlace(offset),
        toNumber(tilt),
        toNumber(scale),
        toBoolean(flipx),
        toBoolean(flipy),
    );
}

export function createPoseLiteral(project: Project, locales: Locales) {
    const PoseType = project.shares.output.Pose;
    return Evaluate.make(
        Reference.make(locales.getName(PoseType.names), PoseType),
        [],
    );
}
