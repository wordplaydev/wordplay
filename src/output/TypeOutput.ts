import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
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
import Fonts, { SupportedFontsFamiliesType } from '../native/Fonts';
import type Locale from '../locale/Locale';

export function createTypeType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Type, TYPE_SYMBOL)}()
`);
}

export const DefaultStyle = 'zippy';

export function createTypeOutputInputs(locales: Locale[]) {
    return `
${getBind(locales, (locale) => locale.output.Type.size)}•#m|ø: ø
${getBind(
    locales,
    (locale) => locale.output.Type.family
)}•${SupportedFontsFamiliesType}|ø: ø
${getBind(locales, (locale) => locale.output.Type.place)}•ø|Place: ø
${getBind(locales, (locale) => locale.output.Type.name)}•""|ø: ø
${getBind(locales, (locale) => locale.output.Type.selectable)}•?: ⊥
${getBind(locales, (locale) => locale.output.Pose.color)}•Color|ø: ø
${getBind(locales, (locale) => locale.output.Pose.opacity)}•%: 100%
${getBind(locales, (locale) => locale.output.Pose.offset)}•Place: Place()
${getBind(locales, (locale) => locale.output.Type.rotation)}•#°: 0°
${getBind(locales, (locale) => locale.output.Pose.scale)}•#: 1
${getBind(locales, (locale) => locale.output.Pose.flipx)}•?: ⊥
${getBind(locales, (locale) => locale.output.Pose.flipy)}•?: ⊥
${getBind(locales, (locale) => locale.output.Type.enter)}•ø|Pose|Sequence: ø
${getBind(locales, (locale) => locale.output.Type.rest)}•ø|Pose|Sequence: ø
${getBind(locales, (locale) => locale.output.Type.move)}•ø|Pose|Sequence: ø
${getBind(locales, (locale) => locale.output.Type.exit)}•ø|Pose|Sequence: ø
${getBind(locales, (locale) => locale.output.Type.duration)}•#s: 0s
${getBind(locales, (locale) => locale.output.Type.style)}•${locales
        .map((locale) =>
            Object.values(locale.output.Easing).map((id) => `"${id}"`)
        )
        .flat()
        .join('|')}: "${DefaultStyle}"
)`;
}

/** Every group has the same style information. */
export default abstract class TypeOutput extends Output {
    readonly size: number | undefined;
    readonly font: string | undefined;
    readonly place: Place | undefined;
    readonly name: TextLang;
    readonly selectable: boolean;
    readonly pose: DefinitePose;
    readonly enter: Pose | Sequence | undefined;
    readonly rest: Pose | Sequence | undefined;
    readonly move: Pose | Sequence | undefined;
    readonly exit: Pose | Sequence | undefined;
    readonly duration: number;
    readonly style: string;

    constructor(
        value: Value,
        size: number | undefined = undefined,
        font: string | undefined = undefined,
        place: Place | undefined = undefined,
        name: TextLang | string,
        selectable: boolean,
        pose: DefinitePose,
        entry: Pose | Sequence | undefined = undefined,
        rest: Pose | Sequence | undefined = undefined,
        move: Pose | Sequence | undefined = undefined,
        exit: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string
    ) {
        super(value);

        this.size = size ? Math.max(0, size) : size;
        this.font = font;
        this.place = place;
        this.name = name instanceof TextLang ? name : new TextLang(value, name);
        this.selectable = selectable;
        this.pose = pose;
        this.enter = entry;
        this.rest = rest;
        this.move = move;
        this.exit = exit;
        this.duration = duration;
        this.style = style;

        if (this.font) Fonts.loadFamily(this.font);
    }

    abstract getLayout(context: RenderContext): {
        output: TypeOutput;
        left: number;
        right: number;
        top: number;
        bottom: number;
        width: number;
        height: number;
        actualHeight: number;
        places: [TypeOutput, Place][];
    };

    abstract getOutput(): (TypeOutput | null)[];
    abstract getBackground(): Color | undefined;
    abstract getDescription(locales: Locale[]): string;

    getRestOrDefaultPose(): Pose | Sequence {
        return this.rest ?? this.pose;
    }

    getFirstRestPose(): Pose {
        return this.rest instanceof Sequence
            ? this.rest.getFirstPose() ?? this.pose
            : this.rest ?? this.pose;
    }

    getDefaultPose(): DefinitePose {
        return this.pose;
    }

    getRenderContext(context: RenderContext) {
        return context.withFontAndSize(this.font, this.size);
    }

    getHTMLID(): string {
        return `output-${this.getName()}`;
    }

    abstract isEmpty(): boolean;

    /**
     * By default, a group's name for the purpose of animations is the ID of the node that created it.
     * */
    getName(): string {
        return this.name.text;
    }

    isAnimated() {
        return (
            this.enter !== undefined ||
            this.rest instanceof Sequence ||
            this.move !== undefined ||
            this.exit !== undefined ||
            this.duration > 0
        );
    }
}
