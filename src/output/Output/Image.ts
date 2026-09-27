import {
    SupportedFontsFamiliesType,
    type SupportedFace,
} from '@basis/faces/Fonts';
import toStructure from '@basis/toStructure';
import type Project from '@db/projects/Project';
import { getBind } from '@locale/getBind';
import DefaultLocale from '@locale/DefaultLocale';
import { getLocaleNames } from '@locale/getInputLocales';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { NameAndDoc } from '@locale/LocaleText';
import Bind from '@nodes/Bind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import Color, { toColor } from '@output/Color/Color';
import Output, { DefaultStyle } from '@output/Output/Output';
import { toFont as toFace, toText } from '@output/Output/Phrase';
import { toNumber, type NameGenerator } from '@output/Output/Stage';
import { getStyle } from '@output/Output/toOutput';
import { getOutputInput } from '@output/Output/Valued';
import type Place from '@output/Place/Place';
import { toPlace } from '@output/Place/Place';
import type Pose from '@output/animation/Pose';
import type { DefinitePose } from '@output/animation/Pose';
import type Sequence from '@output/animation/Sequence';
import ListValue from '@values/ListValue';
import StructureValue from '@values/StructureValue';
import type TextValue from '@values/TextValue';
import type Value from '@values/Value';

/**
 * How wide a picture is when it's given neither a width nor a height.
 *
 * The automatic camera frames whatever is shown, so what this really decides is how big
 * a picture is next to the text and shapes beside it — and a picture is usually the
 * subject rather than a detail.
 */
export const DefaultWidth = 16;

/** Where the style block starts, after the inputs that are this type's own. */
export const StyleIndex = 8;

/**
 * One bare name, for the two places a full `getBind` can't go: a function type's
 * parameter, which takes no doc, and a reference in the body below, where the language
 * tags every name carries (`glyph/en`) are not part of the name being referred to.
 *
 * The first name any chosen locale supplies, in the order `getBind` declares them, so it
 * is always one of the names the bind actually has.
 */
function firstName(
    locales: Locales,
    select: (locale: LocaleText) => NameAndDoc,
): string {
    // en-US last, and never nothing: an untranslated name is dropped by `getLocaleNames`,
    // and an empty reference here would make this structure's body a different shape in
    // that locale — which the name index pairs definitions by position and so can't line up.
    for (const locale of [...locales.getLocales(), DefaultLocale]) {
        const [first] = getLocaleNames(select(locale), locale);
        if (first !== undefined) return first.getName();
    }
    return '';
}

export function createImageType(locales: Locales) {
    const pixel = firstName(locales, (locale) => locale.output.Image.pixel);
    const colors = firstName(locales, (locale) => locale.output.Image.colors);
    const glyph = firstName(locales, (locale) => locale.output.Image.glyph);
    const recolor = firstName(locales, (locale) => locale.output.Image.recolor);
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Image, TYPE_SYMBOL)} Output(
        ${getBind(locales, (locale) => locale.output.Image.colors)}•[[🌈]]
        ${getBind(locales, (locale) => locale.output.Image.description)}•""
        ${getBind(locales, (locale) => locale.output.Image.width)}•#m|ø: ø
        ${getBind(locales, (locale) => locale.output.Image.height)}•#m|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Image.glyph,
        )}•ø|ƒ(${pixel}•🌈)"": ø
        ${getBind(
            locales,
            (locale) => locale.output.Image.recolor,
        )}•ø|ƒ(${pixel}•🌈)🌈: ø
        ${getBind(
            locales,
            (locale) => locale.output.Image.face,
        )}•${SupportedFontsFamiliesType}${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Image.place)}•📍|ø: ø
        ${getBind(locales, (locale) => locale.output.Image.name)}•""|ø: ø
        ${getBind(locales, (locale) => locale.output.Image.selectable)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Image.color)}•🌈${'|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Image.background,
        )}•Color${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Image.opacity)}•%${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Image.offset)}•📍|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Image.rotation,
        )}•#°${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Image.scale)}•#${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Image.flipx)}•?${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Image.flipy)}•?${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Image.entering)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Image.resting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Image.moving)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Image.exiting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Image.duration)}•#s: 0.25s
        ${getBind(locales, (locale) => locale.output.Image.style)}•${locales
            .getLocales()
            .map((locale) =>
                Object.values(locale.output.Easing).map(
                    (id) => `"${id}"/${locale.language}`,
                ),
            )
            .flat()
            .join('|')}: "${DefaultStyle}"
    ) (
        ${getBind(
            locales,
            (locale) => locale.output.Image.glyphs,
        )}: ${glyph} = ø ? ø ${colors}.translate(ƒ(row•[🌈]) row.translate(${glyph}))
        ${getBind(
            locales,
            (locale) => locale.output.Image.palette,
        )}: ${recolor} = ø ? ${colors} ${colors}.translate(ƒ(row•[🌈]) row.translate(${recolor}))
    )
`);
}

/**
 * How big a picture is, from whichever of its width and height it was given.
 *
 * Giving one takes the other from the grid's shape, which is what makes a resolution
 * change invisible: the same subject at more colors is the same size, with smaller
 * squares. Giving both breaks the shape on purpose, so a picture can be squashed without
 * doing arithmetic on the grid.
 */
export function imageSize(
    width: number | undefined,
    height: number | undefined,
    columns: number,
    rows: number,
): { width: number; height: number } {
    // An empty grid has no shape to keep, so it's square.
    const aspect = columns > 0 && rows > 0 ? rows / columns : 1;
    if (width !== undefined && height !== undefined) return { width, height };
    if (width !== undefined) return { width, height: width * aspect };
    if (height !== undefined) return { width: height / aspect, height };
    return { width: DefaultWidth, height: DefaultWidth * aspect };
}

export default class Image extends Output {
    /** The colors to draw, row by row, top row first. */
    readonly colors: Color[][];
    /** What to draw in each square instead of a plain color, if a glyph function was given. */
    readonly glyphs: string[][] | undefined;
    readonly width: number;
    readonly height: number;
    readonly face: SupportedFace | undefined;

    constructor(
        value: StructureValue,
        colors: Color[][],
        glyphs: string[][] | undefined,
        width: number,
        height: number,
        face: SupportedFace | undefined,
        place: Place | undefined,
        name: TextValue | string,
        description: TextValue,
        selectable: boolean,
        background: Color | undefined,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined,
        resting: Pose | Sequence | undefined,
        moving: Pose | Sequence | undefined,
        exiting: Pose | Sequence | undefined,
        duration: number,
        style: string,
    ) {
        super(
            value,
            undefined,
            face,
            place,
            name,
            description,
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

        this.colors = colors;
        this.glyphs = glyphs;
        this.width = width;
        this.height = height;
        this.face = face;
    }

    /** The widest row. Rows may be ragged; a short one leaves its tail unpainted. */
    getColumns() {
        return this.colors.reduce((most, row) => Math.max(most, row.length), 0);
    }

    getRows() {
        return this.colors.length;
    }

    /** Pure geometry, unlike a phrase: a grid's size is given, so nothing is measured. */
    getLayout() {
        return {
            output: this,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: this.width,
            height: this.height,
            ascent: this.height,
            descent: 0,
            places: [],
            // A leaf has nothing of its own to report: its z lives in the place its
            // parent gave it, and Infinity loses every Math.min on the way up.
            nearest: Infinity,
        };
    }

    getOutput(): Output[] {
        return [];
    }

    getBackground(): Color | undefined {
        return this.background;
    }

    find() {
        return undefined;
    }

    getShortDescription(locales: Locales) {
        return this.getDescription(locales);
    }

    /** Always the creator's words, which is why the input is required: a grid of colors
     *  has none of its own to fall back on. The size rides along because it's the one
     *  thing a reader can't otherwise learn. */
    getDescription(locales: Locales) {
        return locales
            .concretize((l) => l.output.Image.defaultDescription, {
                description:
                    typeof this.description === 'string'
                        ? this.description
                        : (this.description?.text ?? ''),
                columns: this.getColumns(),
                rows: this.getRows(),
            })
            .toText();
    }

    getRepresentativeText() {
        return undefined;
    }

    isEmpty() {
        return this.colors.length === 0;
    }

    getEntryAnimated() {
        return this.entering !== undefined ? [this] : [];
    }

    gatherFaces(set: Set<SupportedFace>): Set<SupportedFace> {
        if (this.face !== undefined) set.add(this.face);
        return set;
    }
}

/** A list of lists of `Color`, or undefined if anything in it isn't one. */
export function toColorGrid(value: Value | undefined): Color[][] | undefined {
    if (!(value instanceof ListValue)) return undefined;
    const rows: Color[][] = [];
    for (const row of value.values) {
        if (!(row instanceof ListValue)) return undefined;
        const colors: Color[] = [];
        for (const cell of row.values) {
            const color = toColor(cell);
            if (color === undefined) return undefined;
            colors.push(color);
        }
        rows.push(colors);
    }
    return rows;
}

/** A list of lists of text, or undefined when no glyph function was given. */
function toGlyphGrid(value: Value | undefined): string[][] | undefined {
    if (!(value instanceof ListValue)) return undefined;
    const rows: string[][] = [];
    for (const row of value.values) {
        if (!(row instanceof ListValue)) return undefined;
        const glyphs: string[] = [];
        for (const cell of row.values) {
            const text = toText(cell);
            if (text === undefined) return undefined;
            glyphs.push(text.text);
        }
        rows.push(glyphs);
    }
    return rows;
}

/**
 * The value of one of the structure's own binds, by position in its block.
 *
 * By position rather than by name because the name is locale data: the same bind is
 * `glyphs` for one reader and something else for another, and `toImage` has the project
 * rather than the reader's locales.
 */
function derived(
    project: Project,
    value: StructureValue,
    index: number,
): Value | undefined {
    const bind = project.shares.output.Image.expression?.statements.filter(
        (statement): statement is Bind => statement instanceof Bind,
    )[index];
    return bind === undefined ? undefined : value.resolve(bind.names);
}

export function toImage(
    project: Project,
    value: Value | undefined,
    namer: NameGenerator,
): Image | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const description = toText(getOutputInput(value, 1));
    const givenWidth = toNumber(getOutputInput(value, 2));
    const givenHeight = toNumber(getOutputInput(value, 3));
    const face = toFace(getOutputInput(value, 6));
    const place = toPlace(getOutputInput(value, 7));

    // Both are computed by the structure itself, so a creator's function runs during
    // evaluation rather than anywhere near rendering.
    const glyphs = toGlyphGrid(derived(project, value, 0));
    const colors = toColorGrid(derived(project, value, 1));

    const {
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
    } = getStyle(project, value, StyleIndex, place, false, false);

    if (
        colors === undefined ||
        description === undefined ||
        pose === undefined ||
        selectable === undefined ||
        duration === undefined ||
        style === undefined
    )
        return undefined;

    const { width, height } = imageSize(
        givenWidth,
        givenHeight,
        colors.reduce((most, row) => Math.max(most, row.length), 0),
        colors.length,
    );

    return new Image(
        value,
        colors,
        glyphs,
        width,
        height,
        face,
        place,
        namer.getName(name?.text, value),
        description,
        selectable,
        background,
        pose,
        enter,
        rest,
        move,
        exit,
        duration,
        style,
    );
}
