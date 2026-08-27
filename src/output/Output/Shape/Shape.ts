import type { SupportedFace } from '@basis/faces/Fonts';
import toStructure from '@basis/toStructure';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import { describeColorLocalized } from '@output/Color/BasicColors';
import type Color from '@output/Color/Color';
import { Form } from '@output/Output/Shape/Form';
import { toForm } from '@output/Output/Shape/toForm';
import Output, { DefaultStyle } from '@output/Output/Output';
import Place from '@output/Place/Place';
import type Pose from '@output/animation/Pose';
import type { DefinitePose } from '@output/animation/Pose';
import type Sequence from '@output/animation/Sequence';
import type { NameGenerator } from '@output/Output/Stage';
import type TextValue from '@values/TextValue';
import { toText } from '@output/Output/Phrase';
import { toBoolean } from '@output/Output/Stage';
import { getOutputInput } from '@output/Output/Valued';
import { getStyle } from '@output/Output/toOutput';

export function createShapeType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Shape, TYPE_SYMBOL)} Output(
        ${getBind(locales, (locale) => locale.output.Shape.form)}•Form
        ${getBind(locales, (locale) => locale.output.Shape.name)}•""|ø: ø
        ${getBind(locales, (locale) => locale.output.Shape.description)}•""|ø: ø
        ${getBind(locales, (locale) => locale.output.Shape.selectable)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Shape.color)}•🌈${'|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Shape.background,
        )}•Color${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Shape.opacity)}•%${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Shape.offset)}•📍|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.rotation,
        )}•#°${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Shape.scale)}•#${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Shape.flipx)}•?${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Shape.flipy)}•?${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Shape.entering)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Shape.resting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Shape.moving)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Shape.exiting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Shape.duration)}•#s: 0.25s
        ${getBind(locales, (locale) => locale.output.Shape.style)}•${locales
            .getLocales()
            .map((locale) =>
                Object.values(locale.output.Easing).map(
                    (id) => `"${id}"/${locale.language}`,
                ),
            )
            .flat()
            .join('|')}: "${DefaultStyle}"
        ${getBind(locales, (locale) => locale.output.Shape.filled)}•?: ⊤
        ${getBind(locales, (locale) => locale.output.Shape.stroked)}•?: ⊤
        ${getBind(locales, (locale) => locale.output.Shape.glyphs)}•""|ø: ø
    )
`);
}

/** Where `filled` and `stroked` sit in Shape's inputs. Pinned by shapeInputs.test.ts, since
 *  everything else here reads the style block by fixed offset and would shift silently. */
export const FilledIndex = 18;
export const StrokedIndex = 19;
export const GlyphsIndex = 20;

export default class Shape extends Output {
    readonly form: Form;
    /** Whether to paint the form's interior. An open form has none, so this can't give it one. */
    readonly filled: boolean;
    /** Whether to paint the form's outline. */
    readonly stroked: boolean;
    /** Text laid along the form's outline, repeated to fill it, or undefined for none. */
    readonly glyphs: string | undefined;

    constructor(
        value: StructureValue,
        form: Form,
        name: TextValue | string,
        description: TextValue | undefined,
        selectable: boolean,
        background: Color | undefined,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moving: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string,
        filled: boolean,
        stroked: boolean,
        glyphs: string | undefined,
    ) {
        super(
            value,
            0,
            undefined,
            new Place(
                value,
                form.getLeft(),
                // We render all output from the baseline
                form.getTop() - form.getHeight(),
                form.getZ(),
            ),
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

        this.form = form;
        this.filled = filled;
        this.stroked = stroked;
        this.glyphs = glyphs;
    }

    /** Whether anything of the form itself is painted; false leaves only its glyphs, if any. */
    isVisible() {
        return (
            (this.filled && this.form.isClosed()) ||
            this.stroked ||
            this.glyphs !== undefined
        );
    }

    find() {
        return undefined;
    }

    getOutput(): Output[] {
        return [];
    }

    getLayout() {
        const left = this.form.getLeft();
        const top = this.form.getTop();
        const width = this.form.getWidth();
        const height = this.form.getHeight();

        return {
            output: this,
            left,
            right: left + width,
            top,
            bottom: top - height,
            width,
            height,
            ascent: height,
            descent: 9,
            places: [],
            // A leaf has nothing of its own to report: its z lives in the place its
            // parent gave it, and Infinity loses every Math.min on the way up.
            nearest: Infinity,
        };
    }

    getBackground(): Color | undefined {
        return this.background;
    }

    getShortDescription(locales: Locales) {
        return this.getDescription(locales);
    }

    getDescription(locales: Locales) {
        const base = this.form.getDescription(locales);
        // Append a color description when the shape carries a background
        // color. Shape's description template is form-driven, so we just
        // concatenate the color string rather than threading another
        // interpolation slot.
        // The glyphs the form is drawn with are part of what it is, and the SVG that paints
        // them is presentational, so this is the only place they're spoken.
        const spoken =
            this.glyphs === undefined || this.glyphs.length === 0
                ? base
                : `${base} ${this.glyphs}`;
        const bg = this.background;
        if (bg === undefined) return spoken;
        const color = describeColorLocalized(
            locales,
            bg.lightness.toNumber(),
            bg.chroma.toNumber(),
            bg.hue.toNumber(),
        );
        return `${spoken} ${color}`.trim();
    }

    getRepresentativeText() {
        return undefined;
    }

    isEmpty() {
        return false;
    }

    getEntryAnimated() {
        return this.entering !== undefined ? [this] : [];
    }

    gatherFaces(set: Set<SupportedFace>): Set<SupportedFace> {
        return set;
    }
}

export function toShape(
    project: Project,
    value: Value | undefined,
    namer: NameGenerator,
): Shape | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const form = toForm(project, getOutputInput(value, 0));

    // Appended after the style block rather than beside `color`, so no style index shifts;
    // see getStyle's fixed offsets and editHandles' hard-coded bind indices.
    const filled = toBoolean(getOutputInput(value, FilledIndex)) ?? true;
    const stroked = toBoolean(getOutputInput(value, StrokedIndex)) ?? true;
    const glyphs = toText(getOutputInput(value, GlyphsIndex))?.text;

    const {
        name,
        description,
        selectable,
        background,
        pose,
        resting: rest,
        entering: enter,
        moving: move,
        exiting: exit,
        duration,
        style,
    } = getStyle(project, value, 1);

    return form instanceof Form &&
        pose &&
        selectable !== undefined &&
        duration !== undefined &&
        style !== undefined
        ? new Shape(
              value,
              form,
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
              filled,
              stroked,
              glyphs,
          )
        : undefined;
}
