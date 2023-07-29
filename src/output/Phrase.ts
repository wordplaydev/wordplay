import type Pose from './Pose';
import type Value from '@runtime/Value';
import type Color from './Color';
import Fonts, { type FontWeight } from '../native/Fonts';
import Text from '@runtime/Text';
import TypeOutput, { createTypeOutputInputs } from './TypeOutput';
import type RenderContext from './RenderContext';
import type Place from './Place';
import List from '@runtime/List';
import TextLang from './TextLang';
import toStructure from '../native/toStructure';
import getTextMetrics from './getTextMetrics';
import type Sequence from './Sequence';
import { PX_PER_METER, sizeToPx } from './outputToCSS';
import { getBind } from '@locale/getBind';
import type { NameGenerator } from './Stage';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import type { DefinitePose } from './Pose';
import Structure from '../runtime/Structure';
import { getOutputInput } from './Output';
import { getStyle } from './toTypeOutput';
import DocsValue from '../runtime/DocsValue';
import type LanguageCode from '../locale/LanguageCode';

export function createPhraseType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Phrase, '•')} Type(
        ${getBind(locales, (locale) => locale.output.Phrase.text)}•""|[""]|\`\`
        ${createTypeOutputInputs(locales)}
    )`);
}

export default class Phrase extends TypeOutput {
    readonly text: TextLang[] | DocsValue;

    _metrics:
        | {
              width: number;
              fontAscent: number;
              actualAscent: number;
          }
        | undefined = undefined;

    constructor(
        value: Structure,
        text: TextLang[] | DocsValue,
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
        super(
            value,
            size,
            font,
            place,
            name,
            selectable,
            pose,
            entry,
            rest,
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

    getText() {
        return (this.value as Structure).resolve(
            (this.value as Structure).type.inputs[0].names
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
        const renderedFont = this.font ?? context.font;

        // The size is: whatever is explicitly set, or whatever is inherited in the context.
        // 1) the explicit
        // 2) otherwise, the phrase's size
        const renderedSize = this.size ?? context.size;

        // Get the text that will be rendered.
        const text = this.getLocalizedTextOrDoc(
            context.locales.map((l) => l.language)
        );

        // Figure out a width.
        let width = 0;
        let fontAscent: undefined | number = 0;
        let actualAscent: undefined | number = 0;

        let formats: FormattedText[] =
            text instanceof TextLang
                ? [{ text: text.text, italic: false, weight: undefined }]
                : text.markup.getFormats();

        // Get the list of text nodes and the formats applied to each
        for (const formatted of formats) {
            const metrics = getTextMetrics(
                // Choose the description with the preferred language.
                formatted.text,
                // Convert the size to pixels and choose a font name.
                `${formatted.weight ?? ''} ${
                    formatted.italic ? 'italic' : ''
                } ${sizeToPx(renderedSize)} ${renderedFont}`
            );

            if (metrics) {
                width += metrics.width;
                fontAscent = metrics.fontBoundingBoxAscent;
                actualAscent = Math.max(
                    metrics.actualBoundingBoxAscent,
                    actualAscent
                );
            }
        }

        const dimensions = {
            width,
            fontAscent,
            actualAscent,
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

    getLocalizedTextOrDoc(languages: LanguageCode[]) {
        // Get the list of text lang and doc and find the one with the best matching language.
        if (Array.isArray(this.text)) {
            const options = this.text;
            // Convert the preferred languages into matching text, filtering unmatched languages, and choosing the
            // first match. If no match, default to the first text.
            return (
                languages
                    .map((languages) =>
                        options.find((text) => languages === text.lang)
                    )
                    .filter(
                        (text): text is TextLang => text !== undefined
                    )[0] ?? this.text[0]
            );
        } else return this.text.docs.getLocale(languages);
    }

    getDescription(locales: Locale[]) {
        const text = this.getLocalizedTextOrDoc(locales.map((l) => l.language));
        return text instanceof TextLang ? text.text : text.markup.toText();
    }

    isEmpty() {
        return false;
    }

    toString() {
        return Array.isArray(this.text)
            ? this.text.map((text) => text.text).join(', ')
            : this.text.docs.docs.map((doc) => doc.markup.toText()).join(', ');
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
    if (!(value instanceof Structure)) return undefined;

    let texts = toTextLang(getOutputInput(value, 0));

    const {
        size,
        font,
        place,
        name,
        selectable,
        pose,
        rest,
        enter,
        move,
        exit,
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
            : value instanceof DocsValue
            ? value
            : undefined;

    return texts;
}

export type FormattedText = {
    text: string;
    italic: boolean;
    weight: undefined | FontWeight;
};
