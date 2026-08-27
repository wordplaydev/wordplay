import toStructure from '@basis/toStructure';
import { getBind } from '@locale/getBind';
import { reference } from '@output/animation/DefaultSequences';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type Color from '@output/Color/Color';
import { toColor } from '@output/Color/Color';
import type Place from '@output/Place/Place';
import { toPlace } from '@output/Place/Place';
import { toBoolean, toNumber } from '@output/Output/Stage';
import Valued, { getOutputInputs } from '@output/Output/Valued';

/** `Music`'s locale-stable name, for the `music` input's type. */
const MusicName = reference((locale) => locale.output.Music);

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
        ${getBind(locales, (locale) => locale.output.Pose.music)}•${MusicName}|ø: ø
    )
`);
}

export default class Pose extends Valued {
    readonly color: Color | undefined;
    readonly opacity: number | undefined;
    readonly offset: Place | undefined;
    readonly rotation: number | undefined;
    readonly scale: number | undefined;
    readonly flipx: boolean | undefined;
    readonly flipy: boolean | undefined;
    readonly blur: number | undefined;
    /**
     * The `Music` that sounds when this pose is struck, held **unconverted**.
     *
     * `Music` value-imports `Pose` (its inert default pose), so converting here
     * would close an import cycle that breaks at class-definition time — the spike
     * for this feature hit exactly that. `poseMusic.ts` does the conversion instead;
     * nothing imports it that `Music` can reach.
     */
    readonly music: Value | undefined;

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
        music?: Value,
    ) {
        super(value);

        this.color = color;
        this.opacity = opacity;
        this.offset = offset;
        this.rotation = rotation;
        this.scale = scale;
        this.flipx = flipx;
        this.flipy = flipy;
        this.music = music;
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
            // The one field that doesn't fall back to this pose's: `rest.with(move)`
            // would make a resting pose's sound fire on every move, and
            // `Sequence.compile`'s `defaultPose.with(step)` would put it under every
            // keyframe of a sequence.
            pose.music,
        );
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            this._description = locales
                .concretize((l) => l.output.Pose.description, {
                    opacity:
                        this.opacity !== undefined && this.opacity !== 1
                            ? Math.round(this.opacity)
                            : undefined,
                    rotation:
                        this.rotation !== undefined && this.rotation % 360
                            ? Math.round(this.rotation)
                            : undefined,
                    scale:
                        this.scale !== undefined && this.scale !== 1
                            ? Math.round(this.scale)
                            : undefined,
                    flipx: this.flipx,
                    flipy: this.flipy,
                    blur:
                        this.blur !== undefined && this.blur !== 0
                            ? Math.round(this.blur)
                            : undefined,
                })
                .toText();
        }
        return this._description;
    }

    /** True if this pose's values equal the given pose's.
     *
     *  Deliberately excludes `music`, because this answers whether two poses *look*
     *  the same: it decides whether `rest()` starts a tween, whether `retarget` may
     *  reuse a running animation, and whether the editor calls code animating — all
     *  per-frame paths. Comparing music would either compare object identity (never
     *  equal, so a tween on every stage re-render, and a sound firing continuously)
     *  or force a deep value comparison there. Whether a pose's music is *fresh* is
     *  tracked separately, by `shouldStrikeState` in OutputAnimation. The cost is
     *  that changing only the music of a resting pose does not re-strike; a resting
     *  `Sequence` does, since `Sequence.equals` compares its whole value. */
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
        // An output's default pose is built from its own style inputs, which have no
        // music of their own — only a `Pose(…)` a creator wrote can carry one.
        super(value, color, opacity, offset, rotation, scale, flipx, flipy);
    }
}

export function toPose(
    project: Project,
    value: Value | undefined,
): Pose | undefined {
    if (!(
        value instanceof StructureValue &&
        value.type === project.shares.output.Pose
    ))
        return undefined;

    const [color, opacity, offset, tilt, scale, flipx, flipy, music] =
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
        // Normalized here rather than left as the `ø` an unset input evaluates to,
        // so `music !== undefined` is a cheap, honest test of whether this pose
        // sounds. Recognizing the structure needs only the shared definition, not
        // `Music` itself — see the field's comment.
        music instanceof StructureValue &&
            music.type === project.shares.output.Music
            ? music
            : undefined,
    );
}

export function createPoseLiteral(project: Project, locales: Locales) {
    const PoseType = project.shares.output.Pose;
    return Evaluate.make(
        Reference.make(locales.getName(PoseType.names), PoseType),
        [],
    );
}
