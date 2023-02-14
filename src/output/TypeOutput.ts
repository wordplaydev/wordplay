import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import type Color from './Color';
import Output from './Output';
import type Place from './Place';
import { getBind } from '@translation/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import Sequence from './Sequence';
import TextLang from './TextLang';
import type Pose from './Pose';
import type RenderContext from './RenderContext';
import type Decimal from 'decimal.js';
import Fonts, { SupportedFontsFamiliesType } from '../native/Fonts';
import en from '@translation/translations/en';
import type LanguageCode from '@translation/LanguageCode';
import type { Description } from '@translation/Translation';

export const TypeType = toStructure(`
    ${getBind((t) => t.output.type.definition, TYPE_SYMBOL)}()
`);

export const TypeOutputInputs = `
${getBind((t) => t.output.type.size)}•#m|ø: ø
${getBind((t) => t.output.type.family)}•${SupportedFontsFamiliesType}|ø: ø
${getBind((t) => t.output.type.place)}•ø|Place: ø
${getBind((t) => t.output.type.name)}•""|ø: ø
${getBind((t) => t.output.type.enter)}•ø|Pose|Sequence: ø
${getBind((t) => t.output.type.rest)}•ø|Pose|Sequence: Pose()
${getBind((t) => t.output.type.move)}•ø|Pose|Sequence: ø
${getBind((t) => t.output.type.exit)}•ø|Pose|Sequence: ø
${getBind((t) => t.output.type.duration)}•#s: 0.25s
${getBind((t) => t.output.type.style)}•${Object.values(en.output.easing)
    .map((id) => `"${id}"`)
    .join('|')}: "zippy"
)`;

/** Every group has the same style information. */
export default abstract class TypeOutput extends Output {
    readonly size: number | undefined;
    readonly font: string | undefined;
    readonly place: Place | undefined;
    readonly name: TextLang;
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
        name: TextLang | string,
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
        this.name = name instanceof TextLang ? name : new TextLang(value, name);
        this.enter = entry;
        this.rest = resting;
        this.move = move;
        this.exit = exit;
        this.duration = duration;
        this.style = style;

        if (this.font) Fonts.loadFamily(this.font);
    }

    abstract getWidth(context: RenderContext): Decimal;
    abstract getHeight(context: RenderContext): Decimal;
    abstract getPlaces(context: RenderContext): [TypeOutput, Place][];
    abstract getGroups(): TypeOutput[];
    abstract getBackground(): Color | undefined;
    abstract getDescription(lang: LanguageCode[]): Description;

    getRenderContext(context: RenderContext) {
        return context.withFontAndSize(this.font, this.size);
    }

    getHTMLID(): string {
        return `output-${this.getName()}`;
    }

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
