import type Pose from './Pose';
import type Value from '@runtime/Value';
import type Color from './Color';
import Fonts from '../native/Fonts';
import Text from '@runtime/Text';
import TypeOutput, { createTypeOutputInputs } from './TypeOutput';
import type RenderContext from './RenderContext';
import type Place from './Place';
import List from '@runtime/List';
import TextLang from './TextLang';
import toStructure from '../native/toStructure';
import getTextMetrics from './getTextMetrics';
import parseRichText, { RichNode, TextNode } from './parseRichText';
import type Sequence from './Sequence';
import { PX_PER_METER, sizeToPx } from './outputToCSS';
import { getBind } from '@locale/getBind';
import { getStyle } from './toTypeOutput';
import type { NameGenerator } from './Stage';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';

export function createPhraseType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Phrase, '•')} Type(
        ${getBind(locales, (locale) => locale.output.Phrase.text)}•""|[""]
        ${createTypeOutputInputs(locales)}
    )`);
}

export default class Phrase extends TypeOutput {
    readonly text: TextLang[];

    _metrics:
        | {
              width: number;
              fontAscent: number;
              actualAscent: number;
          }
        | undefined = undefined;

    constructor(
        value: Value,
        text: TextLang[],
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
        super(
            value,
            size,
            font,
            place,
            rotation,
            name,
            selectable,
            entry,
            resting,
            move,
            exit,
            duration,
            style
        );

        this.text = text;

        // Make sure this font is loaded. This is a little late -- we could do some static analysis
        // and try to determine this in advance -- but anything can compute a font name. Maybe an optimization later.
        if (this.font) Fonts.loadFamily(this.font);
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
        const renderedFont = this.font ?? context.font;

        // The size is: whatever is explicitly set, or whatever is inherited in the context.
        // 1) the explicit
        // 2) otherwise, the phrase's size
        const renderedSize = this.size ?? context.size;

        // Get the preferred text
        const text = this.getDescription(context.locales);

        // Parse the text as rich text nodes.
        const rich = parsed
            ? parseRichText(text)
            : new RichNode([new TextNode(text)]);

        // Get the formats of the rich text
        const formats = rich.getTextFormats();

        // Figure out a width.
        let width = 0;
        let fontAscent: undefined | number = undefined;
        let actualAscent: undefined | number = undefined;

        // Get the list of text nodes and the formats applied to each
        for (const [text, format] of formats) {
            // Parse the text into rich text nodes.
            const metrics = getTextMetrics(
                // Choose the description with the preferred language.
                text.text,
                // Convert the size to pixels and choose a font name.
                `${format.weight ?? ''} ${
                    format.italic ? 'italic' : ''
                } ${sizeToPx(renderedSize)} ${renderedFont}`
            );

            if (metrics) {
                width += metrics.width;
                fontAscent = metrics.fontBoundingBoxAscent;
                actualAscent = metrics.actualBoundingBoxAscent;
            }
        }

        const dimensions = {
            width: width,
            fontAscent: fontAscent ?? 0,
            actualAscent: actualAscent ?? 0,
        };
        // If the font is loaded, these metrics can be trusted, so we cache them.
        if (
            actualAscent !== undefined &&
            fontAscent !== undefined &&
            Fonts.isLoaded(renderedFont)
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
            height: metrics.fontAscent / PX_PER_METER,
            actualHeight: metrics.actualAscent / PX_PER_METER,
            places: [],
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(locales: Locale[]) {
        // Convert the preferred languages into matching text, filtering unmatched languages, and choosing the
        // first match. If no match, default to the first text.
        return (
            (
                locales
                    .map((locale) =>
                        this.text.find((text) => locale.language === text.lang)
                    )
                    .filter(
                        (text): text is TextLang => text !== undefined
                    )[0] ?? this.text[0]
            )?.text ?? ''
        );
    }

    isEmpty() {
        return false;
    }

    toString() {
        return this.text[0].text ?? '';
    }
}

export function toFont(value: Value | undefined): string | undefined {
    return value instanceof Text ? value.text : undefined;
}

export function toPhrase(
    project: Project,
    value: Value | undefined,
    namer: NameGenerator | undefined
): Phrase | undefined {
    if (value === undefined) return undefined;

    let texts = toTextLang(value.resolve('text'));

    const {
        size,
        font,
        place,
        rotation,
        name,
        selectable,
        rest,
        enter,
        move,
        exit,
        duration,
        style,
    } = getStyle(project, value);

    return texts !== undefined &&
        duration !== undefined &&
        style !== undefined &&
        rest !== undefined
        ? new Phrase(
              value,
              texts,
              size,
              font,
              place,
              rotation,
              namer?.getName(name?.text, value) ?? `${value.creator.id}`,
              selectable,
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
    return value instanceof Text
        ? new TextLang(value, value.text, value.format)
        : undefined;
}

export function toTextLang(value: Value | undefined) {
    let texts =
        value instanceof Text
            ? [new TextLang(value, value.text, value.format)]
            : value instanceof List &&
              value.values.every((t) => t instanceof Text)
            ? (value.values as Text[]).map(
                  (val) => new TextLang(val, val.text, val.format)
              )
            : undefined;

    return texts;
}
