import toStructure from '@native/toStructure';
import Structure from '@runtime/Structure';
import type Value from '@runtime/Value';
import type Color from './Color';
import Output, { getOutputInputs } from './Output';
import type Place from './Place';
import { toPlace } from './Place';
import { toBoolean, toNumber } from './Stage';
import { toColor } from './Color';
import { getBind } from '@locale/getBind';
import type LanguageCode from '@locale/LanguageCode';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import concretize from '../locale/concretize';

export function createPoseType(locales: Locale[]) {
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

export default class Pose extends Output {
    readonly color?: Color;
    readonly opacity?: number;
    readonly offset?: Place;
    readonly rotation?: number;
    readonly scale?: number;
    readonly flipx?: boolean;
    readonly flipy?: boolean;

    constructor(
        value: Value,
        color?: Color,
        opacity?: number,
        offset?: Place,
        tilt?: number,
        scale?: number,
        flipx?: boolean,
        flipy?: boolean
    ) {
        super(value);

        this.color = color;
        this.opacity = opacity;
        this.offset = offset;
        this.rotation = tilt;
        this.scale = scale;
        this.flipx = flipx;
        this.flipy = flipy;
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
            pose.flipy ?? this.flipy
        );
    }

    getDescription(locales: Locale[]) {
        return concretize(
            locales[0],
            locales[0].output.Pose.description,
            this.opacity !== 1 ? this.opacity : undefined,
            this.rotation !== undefined && this.rotation % 360
                ? this.rotation
                : undefined,
            this.scale !== 1 ? this.scale : undefined,
            this.flipx,
            this.flipy
        ).toText();
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
        opacity: number,
        offset: Place,
        rotation: number,
        scale: number,
        flipx: boolean,
        flipy: boolean
    ) {
        super(value, color, opacity, offset, rotation, scale, flipx, flipy);
    }
}

export function toPose(
    project: Project,
    value: Value | undefined
): Pose | undefined {
    if (
        !(
            value instanceof Structure &&
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
        toBoolean(flipy)
    );
}

export function createPoseLiteral(project: Project, languages: LanguageCode[]) {
    const PoseType = project.shares.output.Pose;
    return Evaluate.make(
        Reference.make(PoseType.names.getLocaleText(languages), PoseType),
        []
    );
}
