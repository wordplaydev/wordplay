import type Pose from './Pose';
import type Value from '@values/Value';
import type Color from './Color';
import Fonts, { type FontWeight } from '../basis/Fonts';
import TextValue from '@values/TextValue';
import TypeOutput, { createTypeOutputInputs } from './TypeOutput';
import type RenderContext from './RenderContext';
import type Place from './Place';
import ListValue from '@values/ListValue';
import TextLang from './TextLang';
import toStructure from '../basis/toStructure';
import getTextMetrics from './getTextMetrics';
import type Sequence from './Sequence';
import { PX_PER_METER, sizeToPx } from './outputToCSS';
import { getBind } from '@locale/getBind';
import { CSSFallbackFaces, type NameGenerator } from './Stage';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import type { DefinitePose } from './Pose';
import StructureValue from '../values/StructureValue';
import { getOutputInput } from './Output';
import { getStyle } from './toTypeOutput';
import MarkupValue from '@values/MarkupValue';
import concretize from '../locale/concretize';
import type Markup from '../nodes/Markup';

export function createPhraseType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Phrase, '•')} Type(
        ${getBind(locales, (locale) => locale.output.Phrase.text)}•""|[""]|\`…\`
        ${createTypeOutputInputs(locales)}
    )`);
}

export type Metrics = {
    /** The pixel width of the rendered text in its font and style. */
    width: number;
    /** The pixel height of the very top of the rendered text to its rendered bottom. */
    height: number;
    /** The pixel ascent of the font. */
    ascent: number;
};

export default class Phrase extends TypeOutput {
    readonly text: TextLang[] | MarkupValue;

    _metrics: Metrics | undefined = undefined;

    constructor(
        value: StructureValue,
        text: TextLang[] | MarkupValue,
        size: number | undefined = undefined,
        font: string | undefined = undefined,
        place: Place | undefined = undefined,
        name: TextLang | string,
        selectable: boolean,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moving: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string
    ) {
        super(
            value,
            size,
            font,
            place,
            name,
            selectable,
            pose,
            entering,
            resting,
            moving,
            exiting,
            duration,
            style
        );

        this.text = text;

        // Make sure this font is loaded. This is a little late -- we could do some static analysis
        // and try to determine this in advance -- but anything can compute a font name. Maybe an optimization later.
        if (this.face) Fonts.loadFace(this.face);
    }

    find(check: (output: TypeOutput) => boolean): TypeOutput | undefined {
        return check(this) ? this : undefined;
    }

    getText() {
        return (this.value as StructureValue).resolve(
            (this.value as StructureValue).type.inputs[0].names
        );
    }

    getMetrics(context: RenderContext, parsed: boolean = true) {
        // Return the cache, if there is one.
        if (parsed && this._metrics) {
            return this._metrics;
        }

        // The font is:
        // 1) the animated font, if there is one
        // 2) this phrase's font, if there is one
        // 3) otherwise, the verse's font.
        const renderedFace = this.face ?? context.face;

        // The size is: whatever is explicitly set, or whatever is inherited in the context.
        // 1) the explicit
        // 2) otherwise, the phrase's size
        const renderedSize = this.size ?? context.size;

        // Get the text that will be rendered.
        const text = this.getLocalizedTextOrDoc(context.locales);

        // Figure out a width.
        let width = 0;
        let height: undefined | number = 0;
        let ascent: undefined | number = 0;

        let formats: FormattedText[] | undefined =
            text instanceof TextLang
                ? [{ text: text.text, italic: false, weight: undefined }]
                : text?.getFormats();

        // Get the list of text nodes and the formats applied to each
        if (formats) {
            for (const formatted of formats) {
                const metrics = getTextMetrics(
                    // Choose the description with the preferred language.
                    formatted.text,
                    // Convert the size to pixels and choose a font name.
                    `${formatted.weight ?? ''} ${
                        formatted.italic ? 'italic' : ''
                    } ${sizeToPx(
                        renderedSize
                    )} "${renderedFace}", ${CSSFallbackFaces}`
                );

                if (metrics) {
                    width += metrics.width;
                    ascent = metrics.fontBoundingBoxAscent;
                    height = Math.max(
                        metrics.actualBoundingBoxAscent +
                            metrics.actualBoundingBoxDescent,
                        height
                    );
                }
            }
        }

        const dimensions = {
            width,
            height,
            ascent,
        };
        // If the font is loaded, these metrics can be trusted, so we cache them.
        if (
            height !== undefined &&
            ascent !== undefined &&
            Fonts.isLoaded(renderedFace)
        )
            this._metrics = dimensions;

        // Return the current dimensions.
        return dimensions;
    }

    getOutput(): TypeOutput[] {
        return [];
    }

    getLayout(context: RenderContext) {
        const metrics = this.getMetrics(context);
        return {
            output: this,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: metrics.width / PX_PER_METER,
            height: metrics.height / PX_PER_METER,
            ascent: metrics.ascent / PX_PER_METER,
            places: [],
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getLocalizedTextOrDoc(locales: Locale[]): TextLang | Markup | undefined {
        // Get the list of text lang and doc and find the one with the best matching language.
        if (Array.isArray(this.text)) {
            const options = this.text;
            // Convert the preferred languages into matching text, filtering unmatched languages, and choosing the
            // first match. If no match, default to the first text.
            return (
                locales
                    .map((locale) =>
                        options.find((text) => locale.language === text.lang)
                    )
                    .filter(
                        (text): text is TextLang => text !== undefined
                    )[0] ?? this.text[0]
            );
        } else return this.text.markup;
    }

    getDescription(locales: Locale[]) {
        const textOrDoc = this.getLocalizedTextOrDoc(locales);
        const text =
            textOrDoc instanceof TextLang
                ? textOrDoc.text
                : textOrDoc?.toText() ?? '';

        return concretize(
            locales[0],
            locales[0].output.Phrase.description,
            text,
            this.name instanceof TextLang ? this.name.text : undefined,
            this.size,
            this.face,
            this.pose.getDescription(locales)
        ).toText();
    }

    isEmpty() {
        return false;
    }

    toString() {
        return Array.isArray(this.text)
            ? this.text.map((text) => text.text).join(', ')
            : this.text.markup.toText();
    }
}

export function toFont(value: Value | undefined): string | undefined {
    return value instanceof TextValue ? value.text : undefined;
}

export function toPhrase(
    project: Project,
    value: Value | undefined,
    namer: NameGenerator | undefined
): Phrase | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    let texts = toTextLang(getOutputInput(value, 0));

    const {
        size,
        face: font,
        place,
        name,
        selectable,
        pose,
        resting: rest,
        entering: enter,
        moving: move,
        exiting: exit,
        duration,
        style,
    } = getStyle(project, value, 1);

    return texts !== undefined &&
        duration !== undefined &&
        style !== undefined &&
        pose &&
        selectable !== undefined
        ? new Phrase(
              value,
              texts,
              size,
              font,
              place,
              namer?.getName(name?.text, value) ?? `${value.creator.id}`,
              selectable,
              pose,
              enter,
              rest,
              move,
              exit,
              duration,
              style
          )
        : undefined;
}

export function toText(value: Value | undefined) {
    return value instanceof TextValue
        ? new TextLang(value, value.text, value.format)
        : undefined;
}

export function toTextLang(value: Value | undefined) {
    let texts =
        value instanceof TextValue
            ? [new TextLang(value, value.text, value.format)]
            : value instanceof ListValue &&
              value.values.every((t) => t instanceof TextValue)
            ? (value.values as TextValue[]).map(
                  (val) => new TextLang(val, val.text, val.format)
              )
            : value instanceof MarkupValue
            ? value
            : undefined;

    return texts;
}

export type FormattedText = {
    text: string;
    italic: boolean;
    weight: undefined | FontWeight;
};
