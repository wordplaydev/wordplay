import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import Output, { DefaultStyle } from './Output';
import type RenderContext from './RenderContext';
import Color from './Color';
import Place from './Place';
import toStructure from '../basis/toStructure';
import NumberValue from '@values/NumberValue';
import Decimal from 'decimal.js';
import ListValue from '@values/ListValue';
import { getBind } from '@locale/getBind';
import BoolValue from '@values/BoolValue';
import { getTypeStyle, toOutput, toOutputList } from './toOutput';
import TextLang from './TextLang';
import Pose, { DefinitePose } from './Pose';
import type Sequence from './Sequence';
import concretize from '../locale/concretize';
import { getOutputInput } from './Valued';
import { SupportedFontsFamiliesType, type SupportedFace } from '../basis/Fonts';
import { toRectangle, type Rectangle } from './Form';
import Shape from './Shape';
import type Evaluator from '../runtime/Evaluator';
import type Locales from '../locale/Locales';
import { getFirstName } from '../locale/Locale';
import { STAGE_SYMBOL } from '@parser/Symbols';

export const DefaultGravity = 9.8;

export const CSSFallbackFaces = '"Noto Color Emoji", "Noto Sans", sans serif';
export const DefaultSize = 1;

export function createStageType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Stage, '•')} Output(
    ${getBind(
        locales,
        (locale) => locale.output.Stage.content,
    )}•[Phrase|Shape|Group]
    ${getBind(locales, (locale) => locale.output.Stage.frame)}•Rectangle|ø: ø
    ${getBind(locales, (locale) => locale.output.Stage.size)}•${'#m: 1m'}
    ${getBind(
        locales,
        (locale) => locale.output.Stage.face,
    )}•${SupportedFontsFamiliesType}: "${locales.getLocales()[0].ui.font.app}"
    ${getBind(locales, (locale) => locale.output.Stage.place)}•📍|ø: ø
    ${getBind(locales, (locale) => locale.output.Stage.name)}•""|ø: ø
    ${getBind(locales, (locale) => locale.output.Stage.selectable)}•?: ⊥
    ${getBind(
        locales,
        (locale) => locale.output.Stage.color,
    )}•🌈${': Color(0% 0 0°)'}
    ${getBind(
        locales,
        (locale) => locale.output.Stage.background,
    )}•Color${': Color(100% 0 0°)'}
    ${getBind(locales, (locale) => locale.output.Stage.opacity)}•%${': 1'}
    ${getBind(locales, (locale) => locale.output.Stage.offset)}•📍|ø: ø
    ${getBind(locales, (locale) => locale.output.Stage.rotation)}•#°${': 0°'}
    ${getBind(locales, (locale) => locale.output.Stage.scale)}•#${': 1'}
    ${getBind(locales, (locale) => locale.output.Stage.flipx)}•?${': ⊥'}
    ${getBind(locales, (locale) => locale.output.Stage.flipy)}•?${': ⊥'}
    ${getBind(locales, (locale) => locale.output.Stage.entering)}•ø|🤪|💃: ø
    ${getBind(locales, (locale) => locale.output.Stage.resting)}•ø|🤪|💃: ø
    ${getBind(locales, (locale) => locale.output.Stage.moving)}•ø|🤪|💃: ø
    ${getBind(locales, (locale) => locale.output.Stage.exiting)}•ø|🤪|💃: ø
    ${getBind(locales, (locale) => locale.output.Stage.duration)}•#s: 0.25s
    ${getBind(locales, (locale) => locale.output.Stage.style)}•${locales
        .getLocales()
        .map((locale) =>
            Object.values(locale.output.Easing).map((id) => `"${id}"`),
        )
        .flat()
        .join('|')}: "${DefaultStyle}"
    ${getBind(
        locales,
        (locale) => locale.output.Stage.gravity,
    )}•#m/s^2: ${DefaultGravity}m/s^2
    )
`);
}

export default class Stage extends Output {
    /** True if the stage was explicit in the program or generated to wrap some other content. */
    readonly explicit: boolean;
    readonly content: (Output | null)[];
    readonly frame: Rectangle | undefined;
    readonly back: Color;
    readonly gravity: number;

    private _description: string | undefined = undefined;

    constructor(
        value: Value,
        explicit: boolean,
        content: (Output | null)[],
        background: Color,
        frame: Rectangle | undefined = undefined,
        size: number,
        face: SupportedFace,
        place: Place | undefined = undefined,
        name: TextLang | string,
        selectable: boolean,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moving: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration = 0,
        style: string | undefined = 'zippy',
        gravity: number,
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

        this.explicit = explicit;
        this.content = content;
        this.frame = frame;
        this.back = background;
        this.gravity = gravity;
    }

    getOutput() {
        return this.content;
    }

    getShapes() {
        return this.content.filter(
            (shape): shape is Shape => shape instanceof Shape,
        );
    }

    find(check: (output: Output) => boolean): Output | undefined {
        for (const output of this.content) {
            if (output !== null) {
                if (check(output)) return output;
            }
        }
        return undefined;
    }

    getLayout(context: RenderContext) {
        const places: [Output, Place][] = [];
        let left = 0,
            right = 0,
            bottom = 0,
            top = 0;
        for (const child of this.content) {
            if (child) {
                const layout = child.getLayout(context);
                const place =
                    // Does the child have it's own place? Put it there.
                    child.place
                        ? child.place
                        : // Otherwise, put it in the center
                          new Place(
                              this.value,
                              // Place everything in the center
                              -layout.width / 2,
                              // We would normally not negate the y because its in math coordinates, but we want to move it
                              // down the y-axis by half, so we subtract.
                              -layout.height / 2,
                              0,
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
            descent: 0,
            places,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getShortDescription(locales: Locales) {
        return this.name instanceof TextLang
            ? this.name.text
            : locales.get((l) => getFirstName(l.output.Group.names));
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            this._description = concretize(
                locales,
                locales.get((l) => l.output.Stage.description),
                this.content.length,
                this.name instanceof TextLang ? this.name.text : undefined,
                this.frame?.getDescription(locales),
                this.pose.getDescription(locales),
            ).toText();
        }
        return this._description;
    }

    getRepresentativeText(locales: Locales) {
        for (const output of this.content) {
            const text = output
                ? output.getRepresentativeText(locales)
                : undefined;
            if (text) return text;
        }
        // No text? Just give a stage symbol.
        return STAGE_SYMBOL;
    }

    isEmpty() {
        return this.content.every((c) => c === null || c.isEmpty());
    }

    getEntryAnimated(): Output[] {
        return [
            ...(this.entering !== undefined ? [this] : []),
            ...this.content.reduce((list: Output[], out) => {
                return [...list, ...(out ? out.getEntryAnimated() : [])];
            }, []),
        ];
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

export function toStage(
    evaluator: Evaluator,
    value: Value,
    namer?: NameGenerator,
): Stage | undefined {
    // If it's a list, find the last stage in the list, if there is one.
    if (value instanceof ListValue)
        return value.values
            .map((val) => toStage(evaluator, val, namer))
            .filter((stage): stage is Stage => stage instanceof Stage)
            .at(-1);

    // Otherwise, we require a structure value.
    if (!(value instanceof StructureValue)) return undefined;

    const project = evaluator.project;

    // Create a name generator to guarantee unique default names for all TypeOutput.
    if (namer === undefined) namer = new NameGenerator();

    // If it's a stage, get outputs to show.
    if (value.type === project.shares.output.Stage) {
        const possibleGroups = getOutputInput(value, 0);
        const content =
            possibleGroups instanceof ListValue
                ? toOutputList(evaluator, possibleGroups, namer)
                : toOutput(evaluator, possibleGroups, namer);
        const frame = toRectangle(getOutputInput(value, 1));

        const gravity = toNumber(getOutputInput(value, 21)) ?? DefaultGravity;

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
        } = getTypeStyle(project, value, 2);

        return content !== undefined &&
            background !== undefined &&
            duration !== undefined &&
            style !== undefined &&
            pose &&
            selectable !== undefined
            ? new Stage(
                  value,
                  true,
                  Array.isArray(content) ? content : [content],
                  background,
                  frame,
                  size ?? DefaultSize,
                  font ?? evaluator.getLocales()[0].ui.font.app,
                  place,
                  namer.getName(name?.text, value),
                  selectable,
                  pose,
                  enter,
                  rest,
                  move,
                  exit,
                  duration,
                  style,
                  gravity,
              )
            : undefined;
    }
    // Just a phrase or group? Wrap it in a stage.
    else {
        const type = toOutput(evaluator, value, namer);

        return type === undefined
            ? undefined
            : new Stage(
                  value,
                  false,
                  [type],
                  new Color(
                      value,
                      new Decimal(100),
                      new Decimal(0),
                      new Decimal(0),
                  ),
                  undefined,
                  DefaultSize,
                  evaluator.getLocales()[0].ui.font.app,
                  undefined,
                  namer.getName(undefined, value),
                  type.selectable,
                  new DefinitePose(
                      value,
                      new Color(
                          value,
                          new Decimal(0),
                          new Decimal(0),
                          new Decimal(0),
                      ),
                      1,
                      new Place(value, 0, 0, 0),
                      0,
                      1,
                      false,
                      false,
                  ),
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  0,
                  DefaultStyle,
                  DefaultGravity,
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
