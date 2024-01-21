import type Pose from './Pose';
import type Value from '@values/Value';
import type Color from './Color';
import Fonts, {
    SupportedFontsFamiliesType,
    type FontWeight,
    type SupportedFace,
} from '../basis/Fonts';
import TextValue from '@values/TextValue';
import Output, { DefaultStyle } from './Output';
import type RenderContext from './RenderContext';
import type Place from './Place';
import ListValue from '@values/ListValue';
import TextLang from './TextLang';
import toStructure from '../basis/toStructure';
import getTextMetrics from './getTextMetrics';
import type Sequence from './Sequence';
import { PX_PER_METER, sizeToPx } from './outputToCSS';
import { getBind } from '@locale/getBind';
import { CSSFallbackFaces, toNumber, type NameGenerator } from './Stage';
import type Project from '../models/Project';
import type { DefinitePose } from './Pose';
import StructureValue from '../values/StructureValue';
import { getOutputInput } from './Valued';
import { getTypeStyle } from './toOutput';
import MarkupValue from '@values/MarkupValue';
import concretize from '../locale/concretize';
import Markup from '../nodes/Markup';
import segmentWraps from './segmentWraps';
import type Matter from './Matter';
import { toMatter } from './Matter';
import type Locales from '../locale/Locales';
import {
    HorizontalLayout,
    VerticalLeftRightLayout,
    VerticalRightLeftLayout,
    layoutToCSS,
    type WritingLayoutSymbol,
} from '@locale/Scripts';
import { toAura } from './Aura';
import type Aura from './Aura';

export function createPhraseType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Phrase, '•')} Output(
        ${getBind(locales, (locale) => locale.output.Phrase.text)}•""|[""]|\`…\`
        ${getBind(locales, (locale) => locale.output.Phrase.size)}•${'#m|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.face,
        )}•${SupportedFontsFamiliesType}${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.place)}•📍|ø: ø
        ${getBind(locales, (locale) => locale.output.Phrase.name)}•""|ø: ø
        ${getBind(locales, (locale) => locale.output.Phrase.selectable)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Phrase.color)}•🌈${'|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.background,
        )}•Color${'|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.opacity,
        )}•%${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.offset)}•📍|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.rotation,
        )}•#°${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.scale)}•#${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.flipx)}•?${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.flipy)}•?${'|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.entering,
        )}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Phrase.resting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Phrase.moving)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Phrase.exiting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Phrase.duration)}•#s: 0.25s
        ${getBind(locales, (locale) => locale.output.Phrase.style)}•${locales
            .getLocales()
            .map((locale) =>
                Object.values(locale.output.Easing).map((id) => `"${id}"`),
            )
            .flat()
            .join('|')}: "${DefaultStyle}"
        ${getBind(locales, (locale) => locale.output.Phrase.wrap)}•#m|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.alignment,
        )}•'<'|'|'|'>': '<'
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.direction,
        )}•'${HorizontalLayout}'|'${VerticalRightLeftLayout}'|'${VerticalLeftRightLayout}': '${HorizontalLayout}'
        ${getBind(locales, (locale) => locale.output.Phrase.matter)}•Matter|ø: ø
        ${getBind(locales, (locale) => locale.output.Phrase.aura)}•ø|🔮: ø
    )`);
}

export type Metrics = {
    /** The pixel width of the rendered text in its font and style. */
    width: number;
    /** The pixel height of the very top of the rendered text to its rendered bottom. */
    height: number;
    /** The pixel ascent of the font. */
    ascent: number;
    /** The pixel descent of the font. */
    descent: number;
};

export default class Phrase extends Output {
    readonly text: TextLang[] | MarkupValue;
    readonly wrap: number | undefined;
    readonly alignment: string | undefined;
    readonly direction: WritingLayoutSymbol;
    readonly matter: Matter | undefined;
    readonly aura: Aura | undefined;

    private _metrics: Metrics | undefined = undefined;

    private _description: string | undefined = undefined;

    constructor(
        value: StructureValue,
        text: TextLang[] | MarkupValue,
        size: number | undefined = undefined,
        face: SupportedFace | undefined = undefined,
        place: Place | undefined = undefined,
        name: TextLang | string,
        selectable: boolean,
        background: Color | undefined,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moving: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string,
        wrap: number | undefined,
        alignment: string | undefined,
        direction: WritingLayoutSymbol,
        matter: Matter | undefined,
        aura: Aura | undefined,
    ) {
        super(
            value,
            size,
            face,
            place,
            name,
            selectable,
            background,
            pose,
            entering,
            resting,
            moving,
            exiting,
            duration,
            style,
        );

        this.text = text;
        this.wrap = wrap === undefined ? undefined : Math.max(1, wrap);
        this.alignment = alignment;
        this.direction = direction;
        this.matter = matter;
        this.aura = aura;

        // Make sure this font is loaded. This is a little late -- we could do some static analysis
        // and try to determine this in advance -- but anything can compute a font name. Maybe an optimization later.
        if (this.face) Fonts.loadFace(this.face);
    }

    find(check: (output: Output) => boolean): Output | undefined {
        return check(this) ? this : undefined;
    }

    getText() {
        return (this.value as StructureValue).resolve(
            (this.value as StructureValue).type.inputs[0].names,
        );
    }

    resetMetrics() {
        this._metrics = undefined;
    }

    getMetrics(context: RenderContext, parsed = true) {
        // Return the cache, if there is one.
        if (parsed && this._metrics) return this._metrics;

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

        // Tracking metrics
        let width = 0;
        let height: undefined | number = 0;
        let ascent: undefined | number = 0;
        let descent: undefined | number = 0;
        const maxWidth =
            this.wrap === undefined ? undefined : this.wrap * PX_PER_METER;
        let totalHeight = 0;

        const formats: FormattedText[] | undefined =
            // Is it plain text? Make a list of unformatted text.
            text instanceof TextLang
                ? [{ text: text.text, italic: false, weight: undefined }]
                : // Otherwise, get the list of formatted segments.
                  text?.getFormats();

        // Remember whether the font is loaded, so we can decide whether to save the metrics.
        const faceLoaded = Fonts.isFaceLoaded(renderedFace);

        // Is the text horizontal or vertical? This determines how we calculate size.
        const horizontal = this.direction === HorizontalLayout;

        // Go through each formatted text,
        for (const formatted of formats) {
            // Split the text by spaces and measure each space separated chunk.
            for (const segment of segmentWraps(formatted.text)) {
                const metrics = getTextMetrics(
                    // Choose the description with the preferred language.
                    segment,
                    // Convert the size to pixels and choose a font name.
                    `${formatted.weight ?? ''} ${
                        formatted.italic ? 'italic' : ''
                    } ${sizeToPx(
                        renderedSize,
                    )} "${renderedFace}", ${CSSFallbackFaces}`,
                    layoutToCSS(this.direction),
                );

                if (metrics) {
                    ascent = metrics.fontBoundingBoxAscent;
                    descent = metrics.fontBoundingBoxDescent;
                    height = Math.max(
                        metrics.actualBoundingBoxAscent +
                            metrics.actualBoundingBoxDescent,
                        height,
                    );
                    // If we're not wrapping, just accumulate the width.
                    if (maxWidth === undefined) {
                        width += metrics.width;
                    }
                    // If we are wrapping, then see if adding this width would exceed the boundary.
                    else {
                        // Past the boundary? Wrap.
                        if (width + metrics.width >= maxWidth) {
                            width = 0;
                            totalHeight +=
                                metrics.fontBoundingBoxAscent +
                                metrics.fontBoundingBoxDescent;
                            height = 0;
                        }
                        // Add the width of the text
                        width += metrics.width;
                    }
                }
            }
        }

        // Wrapping? The width is specified; we just need to compute the height. To do this,
        // we place the
        if (maxWidth !== undefined) {
            width = maxWidth;
            height = totalHeight + (width > 0 ? ascent + descent : 0);
        }

        if (!horizontal) {
            const temp = width;
            width = height;
            height = temp;
        }

        const dimensions = {
            width,
            height,
            ascent,
            descent,
        };
        // If the font is loaded, these metrics can be trusted, so we cache them.
        if (height !== undefined && ascent !== undefined && faceLoaded) {
            this._metrics = dimensions;
        }

        // Return the current dimensions.
        return dimensions;
    }

    getOutput(): Output[] {
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
            descent: metrics.descent / PX_PER_METER,
            places: [],
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getLocalizedTextOrDoc(locales: Locales): TextLang | Markup {
        // Get the list of text lang and doc and find the one with the best matching language.
        if (Array.isArray(this.text)) {
            const options = this.text;
            // Convert the preferred languages into matching text, filtering unmatched languages, and choosing the
            // first match. If no match, default to the first text.
            return (
                locales
                    .getLocales()
                    .map((locale) =>
                        options.find((text) => locale.language === text.lang),
                    )
                    .filter(
                        (text): text is TextLang => text !== undefined,
                    )[0] ?? this.text[0]
            );
        } else return this.text.markup;
    }

    getShortDescription(locales: Locales) {
        const textOrDoc = this.getLocalizedTextOrDoc(locales);
        return textOrDoc instanceof TextLang
            ? textOrDoc.text
            : textOrDoc?.toText() ?? '';
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            const text = this.getShortDescription(locales);

            this._description = concretize(
                locales,
                locales.get((l) => l.output.Phrase.description),
                text,
                this.name instanceof TextLang ? this.name.text : undefined,
                this.size,
                this.face,
                this.pose.getDescription(locales),
            ).toText();
        }
        return this._description;
    }

    getEntryAnimated() {
        return this.entering !== undefined ? [this] : [];
    }

    isEmpty() {
        return false;
    }

    getRepresentativeText(locales: Locales) {
        const preferred = this.getLocalizedTextOrDoc(locales);
        return preferred instanceof Markup
            ? preferred.getRepresentativeText()
            : preferred.text;
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
    namer: NameGenerator,
): Phrase | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const texts = toTextLang(getOutputInput(value, 0));

    const {
        size,
        face: font,
        place,
        name,
        selectable,
        background,
        pose,
        resting: rest,
        entering: enter,
        moving: move,
        exiting: exit,
        duration,
        style,
    } = getTypeStyle(project, value, 1);

    const wrap = toNumber(getOutputInput(value, 20));
    const alignment = toText(getOutputInput(value, 21));
    const direction = toText(getOutputInput(value, 22));
    const matter = toMatter(getOutputInput(value, 23));
    const shadow = toAura(project, getOutputInput(value, 24));

    return texts !== undefined &&
        duration !== undefined &&
        style !== undefined &&
        direction !== undefined &&
        pose &&
        selectable !== undefined
        ? new Phrase(
              value,
              texts,
              size,
              font,
              place,
              namer.getName(name?.text, value),
              selectable,
              background,
              pose,
              enter,
              rest,
              move,
              exit,
              duration,
              style,
              wrap,
              alignment?.text,
              direction.text as WritingLayoutSymbol,
              matter,
              shadow,
          )
        : undefined;
}

export function toText(value: Value | undefined) {
    return value instanceof TextValue
        ? new TextLang(value, value.text, value.format)
        : undefined;
}

export function toTextLang(value: Value | undefined) {
    const texts =
        value instanceof TextValue
            ? [new TextLang(value, value.text, value.format)]
            : value instanceof ListValue &&
                value.values.every((t) => t instanceof TextValue)
              ? (value.values as TextValue[]).map(
                    (val) => new TextLang(val, val.text, val.format),
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
