import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import type Color from './Color';
import Output from './Output';
import type Place from './Place';
import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import Sequence from './Sequence';
import TextLang from './TextLang';
import type Pose from './Pose';
import type { DefinitePose } from './Pose';
import type RenderContext from './RenderContext';
import Fonts, { type SupportedFace } from '../basis/Fonts';
import type Locale from '../locale/Locale';

export function createTypeType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Type, TYPE_SYMBOL)}()
`);
}

export const DefaultStyle = 'zippy';

/** Every group has the same style information. */
export default abstract class TypeOutput extends Output {
    readonly size: number | undefined;
    readonly face: SupportedFace | undefined;
    readonly place: Place | undefined;
    readonly name: TextLang | string;
    readonly selectable: boolean;
    readonly background: Color | undefined;
    readonly pose: DefinitePose;
    readonly entering: Pose | Sequence | undefined;
    readonly resting: Pose | Sequence | undefined;
    readonly moving: Pose | Sequence | undefined;
    readonly exiting: Pose | Sequence | undefined;
    readonly duration: number;
    readonly style: string;

    constructor(
        value: Value,
        size: number | undefined = undefined,
        font: SupportedFace | undefined = undefined,
        place: Place | undefined = undefined,
        name: TextLang | string,
        selectable: boolean,
        background: Color | undefined,
        pose: DefinitePose,
        entry: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moving: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string
    ) {
        super(value);

        this.size = size ? Math.max(0, size) : size;
        this.face = font;
        this.place = place;
        this.name = name;
        this.selectable = selectable;
        this.background = background;
        this.pose = pose;
        this.entering = entry;
        this.resting = resting;
        this.moving = moving;
        this.exiting = exiting;
        this.duration = duration;
        this.style = style;

        if (this.face) Fonts.loadFace(this.face);
    }

    abstract getLayout(context: RenderContext): {
        output: TypeOutput;
        left: number;
        right: number;
        top: number;
        bottom: number;
        width: number;
        height: number;
        ascent: number;
        places: [TypeOutput, Place][];
    };

    abstract getOutput(): (TypeOutput | null)[];
    abstract getBackground(): Color | undefined;
    abstract getShortDescription(locales: Locale[]): string;
    abstract getDescription(locales: Locale[]): string;

    /* 
    Given a predict function that takes a type input, recursively scans
    outputs for a match.
    */
    abstract find(
        check: (output: TypeOutput) => boolean
    ): TypeOutput | undefined;

    getRestOrDefaultPose(): Pose | Sequence {
        return this.resting ?? this.pose;
    }

    getFirstRestPose(): Pose {
        return this.resting instanceof Sequence
            ? this.resting.getFirstPose() ?? this.pose
            : this.resting ?? this.pose;
    }

    getDefaultPose(): DefinitePose {
        return this.pose;
    }

    getRenderContext(context: RenderContext) {
        return context.withFontAndSize(this.face, this.size);
    }

    getHTMLID(): string {
        return `output-${this.getName()}`;
    }

    abstract isEmpty(): boolean;

    /**
     * By default, a group's name for the purpose of animations is the ID of the node that created it.
     * */
    getName(): string {
        return this.name instanceof TextLang ? this.name.text : this.name;
    }

    isAnimated() {
        return (
            this.entering !== undefined ||
            this.resting instanceof Sequence ||
            this.moving !== undefined ||
            this.exiting !== undefined ||
            this.duration > 0
        );
    }
}
