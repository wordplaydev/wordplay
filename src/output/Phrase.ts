import type Pose from './Pose';
import type Value from '@runtime/Value';
import type Color from './Color';
import Fonts, { SupportedFontsFamiliesType } from '../native/Fonts';
import Text from '@runtime/Text';
import Group from './Group';
import type { RenderContext } from './RenderContext';
import type Place from './Place';
import List from '@runtime/List';
import TextLang from './TextLang';
import toStructure from '../native/toStructure';
import Decimal from 'decimal.js';
import { toDecimal } from './Verse';
import getTextMetrics from './getTextMetrics';
import parseRichText, { RichNode, TextNode } from './parseRichText';
import { toPose as toPose } from './Pose';
import Sequence from './Sequence';
import { PX_PER_METER, sizeToPx } from './outputToCSS';
import { toSequence } from './Sequence';
import type LanguageCode from '@translation/LanguageCode';
import { getBind } from '@translation/getBind';
import { toPlace } from './Place';
import en from '../translation/translations/en';

export const PhraseType = toStructure(`
    ${getBind((t) => t.output.phrase.definition, '•')} Group(
        ${getBind((t) => t.output.phrase.text)}•""|[""]
        ${getBind((t) => t.output.phrase.size)}•#m: 1m
        ${getBind(
            (t) => t.output.phrase.family
        )}•${SupportedFontsFamiliesType}|ø: ø
        ${getBind((t) => t.output.phrase.place)}•ø|Place: ø
        ${getBind((t) => t.output.phrase.name)}•""|ø: ø
        ${getBind((t) => t.output.phrase.enter)}•ø|Pose|Sequence: ø
        ${getBind((t) => t.output.phrase.rest)}•ø|Pose|Sequence: Pose()
        ${getBind((t) => t.output.phrase.move)}•ø|Pose|Sequence: ø
        ${getBind((t) => t.output.phrase.exit)}•ø|Pose|Sequence: ø
        ${getBind((t) => t.output.timing.duration)}•#s: 0.25s
        ${getBind((t) => t.output.timing.style)}•${Object.values(
    en.output.easing
)
    .map((id) => `"${id}"`)
    .join('|')}: "zippy"
    )
`);

export default class Phrase extends Group {
    readonly text: TextLang[];
    readonly size: number;
    readonly font: string | undefined;
    readonly place: Place | undefined;
    readonly name: TextLang | undefined;
    readonly enter: Pose | Sequence | undefined;
    readonly rest: Pose | Sequence;
    readonly move: Pose | Sequence | undefined;
    readonly exit: Pose | Sequence | undefined;
    readonly duration: number;
    readonly style: string;

    _metrics:
        | {
              width: number;
              ascent: number;
          }
        | undefined = undefined;

    constructor(
        value: Value,
        text: TextLang[],
        size: number,
        font: string | undefined = undefined,
        place: Place | undefined = undefined,
        name: TextLang | undefined = undefined,
        entry: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence,
        move: Pose | Sequence | undefined = undefined,
        exit: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string
    ) {
        super(value);

        this.text = text;
        this.size = size;
        this.font = font;
        this.place = place;
        this.name = name;
        this.enter = entry;
        this.rest = resting;
        this.move = move;
        this.exit = exit;
        this.duration = duration;
        this.style = style;

        // Make sure this font is loaded. This is a little late -- we could do some static analysis
        // and try to determine this in advance -- but anything can compute a font name. Maybe an optimization later.
        if (this.font) Fonts.loadFamily(this.font);
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

    getMetrics(context: RenderContext, parsed: boolean = true) {
        // Return the cache, if there is one.
        if (parsed && this._metrics) return this._metrics;

        // The font is:
        // 1) the animated font, if there is one
        // 2) this phrase's font, if there is one
        // 3) otherwise, the verse's font.
        const renderedFont = this.font ?? context.font;

        // The size is:
        // 1) the animated size, if there is one
        // 2) otherwise, the phrase's size
        const renderedSize = this.size;

        // Get the preferred text
        const text = this.getDescription(context.languages);

        // Parse the text as rich text nodes.
        const rich = parsed
            ? parseRichText(text)
            : new RichNode([new TextNode(text)]);

        // Get the formats of the rich text
        const formats = rich.getTextFormats();

        // Figure out a width.
        let width = 0;
        let ascent: undefined | number = undefined;

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
                ascent = metrics.fontBoundingBoxAscent;
            }
        }

        const dimensions = {
            width: width,
            ascent: ascent ?? 0,
        };
        // If the font is loaded, these metrics can be trusted, so we cache them.
        if (ascent && Fonts.isLoaded(renderedFont)) this._metrics = dimensions;

        // Return the current dimensions.
        return dimensions;
    }

    getHTMLID(): string {
        return `phrase-${this.getName()}`;
    }

    getName(): string {
        return this.name?.text ?? Number(this.value.creator.id).toString();
    }

    getWidth(context: RenderContext): Decimal {
        // Metrics is in pixels; convert to meters.
        return new Decimal(this.getMetrics(context).width).div(PX_PER_METER);
    }

    getHeight(context: RenderContext): Decimal {
        return new Decimal(this.getMetrics(context).ascent).div(PX_PER_METER);
    }

    getGroups(): Group[] {
        return [];
    }
    getPlaces(): [Group, Place][] {
        return [];
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(languages: LanguageCode[]): string {
        return (
            // Convert the preferred languages into matching text, filtering unmatched languages, and choosing the
            // first match. If no match, default to the first text.
            (
                languages
                    .map((lang) => this.text.find((text) => lang === text.lang))
                    .filter(
                        (text): text is TextLang => text !== undefined
                    )[0] ?? this.text[0]
            ).text
        );
    }

    toString() {
        return this.text[0].text;
    }
}

export function toFont(value: Value | undefined): string | undefined {
    return value instanceof Text ? value.text : undefined;
}

export function toPhrase(value: Value | undefined): Phrase | undefined {
    if (value === undefined) return undefined;

    let texts = toTextLang(value.resolve('text'));
    const size = toDecimal(value.resolve('size'))?.toNumber() ?? 1;
    const font = toFont(value.resolve('font'));
    const name = toText(value.resolve('name'));
    const place = toPlace(value.resolve('place'));
    const still =
        toPose(value.resolve('rest')) ?? toSequence(value.resolve('rest'));
    const entry =
        toPose(value.resolve('enter')) ?? toSequence(value.resolve('enter'));
    const between =
        toPose(value.resolve('move')) ?? toSequence(value.resolve('move'));
    const exit =
        toPose(value.resolve('exit')) ?? toSequence(value.resolve('exit'));

    const duration = toDecimal(value.resolve('duration'));
    const style = value.resolve('style');

    return texts && duration && style instanceof Text && still
        ? new Phrase(
              value,
              texts,
              size,
              font,
              place,
              name,
              entry,
              still,
              between,
              exit,
              duration.toNumber(),
              style.text
          )
        : undefined;
}

function toText(value: Value | undefined) {
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
