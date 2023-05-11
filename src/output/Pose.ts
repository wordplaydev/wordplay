import toStructure from '@native/toStructure';
import Structure from '@runtime/Structure';
import type Value from '@runtime/Value';
import type Color from './Color';
import Output from './Output';
import type Place from './Place';
import { toPlace } from './Place';
import { toBoolean, toDecimal } from './Verse';
import { toColor } from './Color';
import { getBind } from '@locale/getBind';
import type LanguageCode from '@locale/LanguageCode';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';

export const PoseType = toStructure(`
    ${getBind((t) => t.output.pose, '•')}(
        ${getBind((t) => t.output.pose.color)}•Color|ø: ø
        ${getBind((t) => t.output.pose.opacity)}•%|ø: ø
        ${getBind((t) => t.output.pose.offset)}•Place|ø: ø
        ${getBind((t) => t.output.pose.tilt)}•#°|ø: ø
        ${getBind((t) => t.output.pose.scale)}•#|ø: ø
        ${getBind((t) => t.output.pose.flipx)}•?|ø: ø
        ${getBind((t) => t.output.pose.flipy)}•?|ø: ø
    )
`);

export default class Pose extends Output {
    readonly color?: Color;
    readonly opacity?: number;
    readonly offset?: Place;
    readonly tilt?: number;
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
        this.tilt = tilt;
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
            pose.tilt ?? this.tilt,
            pose.scale ?? this.scale,
            pose.flipx ?? this.flipx,
            pose.flipy ?? this.flipy
        );
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
            this.tilt === pose.tilt &&
            this.scale === pose.scale &&
            this.flipx === pose.flipx &&
            this.flipy === pose.flipy
        );
    }
}

export function toPose(value: Value | undefined): Pose | undefined {
    if (!(value instanceof Structure && value.type === PoseType))
        return undefined;

    const color = toColor(value.resolve('color'));
    const opacity = toDecimal(value.resolve('opacity'))?.toNumber();
    const offset = toPlace(value.resolve('offset'));
    const tilt = toDecimal(value.resolve('tilt'))?.toNumber();
    const scale = toDecimal(value.resolve('scale'))?.toNumber();
    const flipx = toBoolean(value.resolve('flipx'));
    const flipy = toBoolean(value.resolve('flipy'));

    return new Pose(value, color, opacity, offset, tilt, scale, flipx, flipy);
}

export function createPoseLiteral(languages: LanguageCode[]) {
    return Evaluate.make(
        Reference.make(PoseType.names.getLocaleText(languages), PoseType),
        []
    );
}
