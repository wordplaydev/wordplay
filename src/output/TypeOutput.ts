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
import type RenderContext from './RenderContext';
import Fonts, { SupportedFontsFamiliesType } from '../native/Fonts';
import en from '@locale/locales/en';
import type LanguageCode from '@locale/LanguageCode';

export const TypeType = toStructure(`
    ${getBind((t) => t.output.Type, TYPE_SYMBOL)}()
`);

export const DefaultStyle = 'zippy';

export const TypeOutputInputs = `
${getBind((t) => t.output.Type.size)}•#m|ø: ø
${getBind((t) => t.output.Type.family)}•${SupportedFontsFamiliesType}|ø: ø
${getBind((t) => t.output.Type.place)}•ø|Place: ø
${getBind((t) => t.output.Type.rotation)}•#°|ø: ø
${getBind((t) => t.output.Type.name)}•""|ø: ø
${getBind((t) => t.output.Type.selectable)}•?: ⊥
${getBind((t) => t.output.Type.enter)}•ø|Pose|Sequence: ø
${getBind((t) => t.output.Type.rest)}•ø|Pose|Sequence: Pose()
${getBind((t) => t.output.Type.move)}•ø|Pose|Sequence: ø
${getBind((t) => t.output.Type.exit)}•ø|Pose|Sequence: ø
${getBind((t) => t.output.Type.duration)}•#s: 0s
${getBind((t) => t.output.Type.style)}•${Object.values(en.output.Easing)
    .map((id) => `"${id}"`)
    .join('|')}: "${DefaultStyle}"
)`;

/** Every group has the same style information. */
export default abstract class TypeOutput extends Output {
    readonly size: number | undefined;
    readonly font: string | undefined;
    readonly place: Place | undefined;
    readonly rotation: number | undefined;
    readonly name: TextLang;
    readonly selectable: boolean;
    readonly enter: Pose | Sequence | undefined;
    readonly rest: Pose | Sequence;
    readonly move: Pose | Sequence | undefined;
    readonly exit: Pose | Sequence | undefined;
    readonly duration: number;
    readonly style: string;

    constructor(
        value: Value,
        size: number | undefined = undefined,
        font: string | undefined = undefined,
        place: Place | undefined = undefined,
        rotation: number | undefined = undefined,
        name: TextLang | string,
        selectable: boolean,
        entry: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence,
        move: Pose | Sequence | undefined = undefined,
        exit: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string
    ) {
        super(value);

        this.size = size;
        this.font = font;
        this.place = place;
        this.rotation = rotation;
        this.name = name instanceof TextLang ? name : new TextLang(value, name);
        this.selectable = selectable;
        this.enter = entry;
        this.rest = resting;
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
        places: [TypeOutput, Place][];
    };

    abstract getOutput(): (TypeOutput | null)[];
    abstract getBackground(): Color | undefined;
    abstract getDescription(lang: LanguageCode[]): string;

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
