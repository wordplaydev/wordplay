import toStructure from '../basis/toStructure';
import type Value from '../values/Value';
import { getBind } from '../locale/getBind';
import type Arrangement from './Arrangement';
import type Color from './Color';
import type Place from './Place';
import type Pose from './Pose';
import type RenderContext from './RenderContext';
import type Sequence from './Sequence';
import type TextLang from './TextLang';
import TypeOutput, { createTypeOutputInputs } from './TypeOutput';
import { getStyle, toArrangement, toTypeOutputList } from './toTypeOutput';
import { TYPE_SYMBOL } from '../parser/Symbols';
import type { NameGenerator } from './Stage';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import type { DefinitePose } from './Pose';
import StructureValue from '@values/StructureValue';
import { getOutputInput } from './Output';
import concretize from '../locale/concretize';

export function createGroupType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Group, TYPE_SYMBOL)} Type(
        ${getBind(locales, (locale) => locale.output.Group.layout)}•Arrangement
        ${getBind(locales, (locale) => locale.output.Group.content)}•[Type|ø]
        ${createTypeOutputInputs(locales)}
    )`);
}

export default class Group extends TypeOutput {
    readonly content: (TypeOutput | null)[];
    readonly layout: Arrangement;

    constructor(
        value: Value,
        layout: Arrangement,
        content: (TypeOutput | null)[],
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

        this.content = content;
        this.layout = layout;
    }

    getLayout(context: RenderContext) {
        const layout = this.layout.getLayout(this.content, context);
        return {
            output: this,
            left: layout.left,
            top: layout.top,
            right: layout.right,
            bottom: layout.bottom,
            width: layout.width,
            height: layout.height,
            actualHeight: layout.height,
            places: layout.places,
        };
    }

    getOutput() {
        return this.content;
    }

    find(check: (output: TypeOutput) => boolean): TypeOutput | undefined {
        for (const output of this.content) {
            if (output !== null) {
                if (check(output)) return output;
            }
        }
        return undefined;
    }

    getBackground(): Color | undefined {
        throw new Error('Method not implemented.');
    }

    getDescription(locales: Locale[]) {
        return concretize(
            locales[0],
            locales[0].output.Group.description,
            this.layout.getDescription(this.content, locales),
            this.pose.getDescription(locales)
        ).toText();
    }

    isEmpty() {
        return this.content.every((c) => c === null || c.isEmpty());
    }
}

export function toGroup(
    project: Project,
    value: Value | undefined,
    namer?: NameGenerator
): Group | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const layout = toArrangement(project, getOutputInput(value, 0));
    const content = toTypeOutputList(project, getOutputInput(value, 1), namer);

    const {
        size,
        font,
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
    } = getStyle(project, value, 2);

    return layout &&
        content &&
        duration !== undefined &&
        style !== undefined &&
        pose &&
        selectable !== undefined
        ? new Group(
              value,
              layout,
              content,
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
