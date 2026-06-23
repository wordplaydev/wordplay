import type { SupportedFace } from '@basis/Fonts';
import toStructure from '@basis/toStructure';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import { describeColorLocalized } from '@output/BasicColors';
import type Color from '@output/Color';
import { Form, toForm } from '@output/Form';
import Output, { DefaultStyle } from '@output/Output';
import Place from '@output/Place';
import type Pose from '@output/Pose';
import type { DefinitePose } from '@output/Pose';
import type Sequence from '@output/Sequence';
import type { NameGenerator } from '@output/Stage';
import type TextValue from '@values/TextValue';
import { getOutputInput } from '@output/Valued';
import { getStyle } from '@output/toOutput';

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
    )
`);
}

export default class Shape extends Output {
    readonly form: Form;

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
        const bg = this.background;
        if (bg === undefined) return base;
        const color = describeColorLocalized(
            locales,
            bg.lightness.toNumber(),
            bg.chroma.toNumber(),
            bg.hue.toNumber(),
        );
        return `${base} ${color}`.trim();
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
          )
        : undefined;
}
