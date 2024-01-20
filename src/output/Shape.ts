import toStructure from '../basis/toStructure';
import { TYPE_SYMBOL } from '../parser/Symbols';
import StructureValue from '../values/StructureValue';
import { getBind } from '../locale/getBind';
import type Color from './Color';
import Output, { DefaultStyle } from './Output';
import type TextLang from './TextLang';
import type { DefinitePose } from './Pose';
import type Pose from './Pose';
import type Sequence from './Sequence';
import { Form, toRectangle } from './Form';
import type Project from '../models/Project';
import type Value from '../values/Value';
import type { NameGenerator } from './Stage';
import { getOutputInput } from './Valued';
import { getStyle } from './toOutput';
import Place from './Place';
import type Locales from '../locale/Locales';

export function createShapeType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Shape, TYPE_SYMBOL)} Output(
        ${getBind(locales, (locale) => locale.output.Shape.form)}•Rectangle
        ${getBind(locales, (locale) => locale.output.Shape.name)}•""|ø: ø
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
                Object.values(locale.output.Easing).map((id) => `"${id}"`),
            )
            .flat()
            .join('|')}: "${DefaultStyle}"
    )
`);
}

export function createRectangleType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Rectangle, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Rectangle.left)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.top)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.right)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.bottom)}•#m
        ${getBind(locales, (locale) => locale.output.Rectangle.z)}•#m: 0m
    )
`);
}

export default class Shape extends Output {
    readonly form: Form;

    constructor(
        value: StructureValue,
        form: Form,
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
        return this.form.getDescription(locales);
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
}

export function toShape(
    project: Project,
    value: Value | undefined,
    namer: NameGenerator,
): Shape | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const form = toRectangle(getOutputInput(value, 0));

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
