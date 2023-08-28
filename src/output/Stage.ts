import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import TypeOutput, { createTypeOutputInputs } from './TypeOutput';
import type RenderContext from './RenderContext';
import Color from './Color';
import Place from './Place';
import toStructure from '../basis/toStructure';
import NumberValue from '@values/NumberValue';
import Decimal from 'decimal.js';
import ListValue from '@values/ListValue';
import { getBind } from '@locale/getBind';
import BoolValue from '@values/BoolValue';
import { getStyle, toTypeOutput, toTypeOutputList } from './toTypeOutput';
import TextLang from './TextLang';
import Pose, { DefinitePose } from './Pose';
import type Sequence from './Sequence';
import { toShape, type Shape } from './Shapes';
import concretize from '../locale/concretize';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import { getOutputInput } from './Output';
import type { SupportedFace } from '../basis/Fonts';
import { getFirstName } from '../locale/Locale';

export const CSSFallbackFaces = `"Noto Color Emoji"`;
export const DefaultSize = 1;

export function createStageType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Stage, '•')} Type(
        ${getBind(locales, (locale) => locale.output.Stage.content)}•[Type]
        ${getBind(locales, (locale) => locale.output.Stage.frame)}•Shape|ø: ø
        ${createTypeOutputInputs(locales, true)}
    )
`);
}

export default class Stage extends TypeOutput {
    readonly content: (TypeOutput | null)[];
    readonly frame: Shape | undefined;
    readonly back: Color;

    private _description: string | undefined = undefined;

    constructor(
        value: Value,
        content: (TypeOutput | null)[],
        background: Color,
        frame: Shape | undefined = undefined,
        size: number,
        face: SupportedFace,
        place: Place | undefined = undefined,
        name: TextLang | string,
        selectable: boolean,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moveing: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration = 0,
        style: string | undefined = 'zippy'
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
            moveing,
            exiting,
            duration,
            style
        );

        this.content = content;
        this.frame = frame;
        this.back = background;
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

    getLayout(context: RenderContext) {
        const places: [TypeOutput, Place][] = [];
        let left = 0,
            right = 0,
            bottom = 0,
            top = 0;
        for (const child of this.content) {
            if (child) {
                const layout = child.getLayout(context);
                const place = child.place
                    ? child.place
                    : new Place(
                          this.value,
                          // Place everything in the center
                          -layout.width / 2,
                          // We would normally not negate the y because its in math coordinates, but we want to move it
                          // down the y-axis by half, so we subtract.
                          -layout.height / 2,
                          0
                      );
                places.push([child, place]);

                if (place.x < left) left = place.x;
                if (place.x + layout.width > right)
                    right = place.x + layout.width;
                if (place.y < bottom) bottom = place.y;
                if (place.y + layout.height > top)
                    top = place.y + layout.height;
            }
        }

        return {
            output: this,
            left,
            right,
            top,
            bottom,
            width: right - left,
            height: top - bottom,
            ascent: top - bottom,
            places,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getShortDescription(locales: Locale[]) {
        return this.name instanceof TextLang
            ? this.name.text
            : getFirstName(locales[0].output.Group.names);
    }

    getDescription(locales: Locale[]) {
        if (this._description === undefined) {
            this._description = concretize(
                locales[0],
                locales[0].output.Stage.description,
                this.content.length,
                this.name instanceof TextLang ? this.name.text : undefined,
                this.frame?.getDescription(locales[0]),
                this.pose.getDescription(locales)
            ).toText();
        }
        return this._description;
    }

    isEmpty() {
        return this.content.every((c) => c === null || c.isEmpty());
    }
}

export class NameGenerator {
    /** Number visible phrases, giving them unique IDs to key off of. */
    readonly counter = new Map<number, number>();
    readonly names = new Map<string, number>();

    getName(name: string | undefined, value: Value) {
        // If given a name, make sure it's not a duplicate,
        // and if it is, make it unique by appending a number.
        let newName: string;
        if (name) {
            const existingNameCount = this.names.get(name);
            if (existingNameCount !== undefined)
                name = name + (existingNameCount + 1);
            newName = name;
            // Remember this name to prevent duplicates.
            this.names.set(newName, (existingNameCount ?? 0) + 1);
        } else {
            const nodeID = value.creator.id;
            const count = (this.counter.get(nodeID) ?? 0) + 1;
            this.counter.set(nodeID, count);
            newName = `${nodeID}-${count}`;
        }
        return newName;
    }
}

export function toStage(project: Project, value: Value): Stage | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    // Create a name generator to guarantee unique default names for all TypeOutput.
    const namer = new NameGenerator();

    if (value.type === project.shares.output.Stage) {
        const possibleGroups = getOutputInput(value, 0);
        const content =
            possibleGroups instanceof ListValue
                ? toTypeOutputList(project, possibleGroups, namer)
                : toTypeOutput(project, possibleGroups, namer);
        const frame = toShape(getOutputInput(value, 1));

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
        } = getStyle(project, value, 2);

        return content !== undefined &&
            background !== undefined &&
            duration !== undefined &&
            style !== undefined &&
            pose &&
            selectable !== undefined
            ? new Stage(
                  value,
                  Array.isArray(content) ? content : [content],
                  background,
                  frame,
                  size ?? DefaultSize,
                  font ?? project.locales[0].ui.font.app,
                  place,
                  namer.getName(name?.text, value),
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
    // Try converting it to a group and wrapping it in a Stage with some
    // default stage values.
    else {
        const type = toTypeOutput(project, value, namer);

        return type === undefined
            ? undefined
            : new Stage(
                  value,
                  [type],
                  new Color(
                      value,
                      new Decimal(100),
                      new Decimal(0),
                      new Decimal(0)
                  ),
                  undefined,
                  DefaultSize,
                  project.locales[0].ui.font.app,
                  undefined,
                  namer.getName(undefined, value),
                  type.selectable,
                  new DefinitePose(
                      value,
                      new Color(
                          value,
                          new Decimal(0),
                          new Decimal(0),
                          new Decimal(0)
                      ),
                      1,
                      new Place(value, 0, 0, 0),
                      0,
                      1,
                      false,
                      false
                  ),
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  0,
                  'zippy'
              );
    }
}

export function toDecimal(value: Value | undefined): Decimal | undefined {
    return value instanceof NumberValue ? value.num : undefined;
}

export function toNumber(value: Value | undefined): number | undefined {
    return toDecimal(value)?.toNumber();
}

export function toBoolean(value: Value | undefined): boolean | undefined {
    return value instanceof BoolValue ? value.bool : undefined;
}
