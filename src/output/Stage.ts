import { getBind } from '@locale/getBind';
import { STAGE_SYMBOL } from '@parser/Symbols';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import Decimal from 'decimal.js';
import { SupportedFontsFamiliesType, type SupportedFace } from '@basis/Fonts';
import toStructure from '@basis/toStructure';
import type Locales from '@locale/Locales';
import { getFirstText } from '@locale/LocaleText';
import type Evaluator from '@runtime/Evaluator';
import Color from '@output/Color';
import { Form, toForm } from '@output/Form';
import Group from '@output/Group';
import Output, { DefaultStyle } from '@output/Output';
import Place from '@output/Place';
import Pose, { DefinitePose } from '@output/Pose';
import type RenderContext from '@output/RenderContext';
import Say from '@output/Say';
import type Sequence from '@output/Sequence';
import Shape from '@output/Shape';
import { Stack } from '@output/Stack';
import TextLang from '@output/TextLang';
import { getTypeStyle, toOutput, toOutputList } from '@output/toOutput';
import { getOutputInput } from '@output/Valued';

export const DefaultGravity = 9.8;

export const CSSFallbackFaces = '"Noto Color Emoji", "Noto Sans", sans serif';
export const DefaultSize = 1;

export function createStageType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Stage, '•')} Output(
    ${getBind(
        locales,
        (locale) => locale.output.Stage.content,
    )}•[Phrase|Shape|Group|Say]
    ${getBind(locales, (locale) => locale.output.Stage.frame)}•Form|ø: ø
    ${getBind(locales, (locale) => locale.output.Stage.size)}•${'#m: 1m'}
    ${getBind(
        locales,
        (locale) => locale.output.Stage.face,
    )}•${SupportedFontsFamiliesType}: "${locales.getLocales()[0].ui.font.app}"
    ${getBind(locales, (locale) => locale.output.Stage.place)}•📍|ø: ø
    ${getBind(locales, (locale) => locale.output.Stage.name)}•""|ø: ø
    ${getBind(locales, (locale) => locale.output.Stage.description)}•""|ø: ø
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
    readonly frame: Form | undefined;
    readonly back: Color;
    readonly gravity: number;

    private _description: string | undefined = undefined;

    constructor(
        value: Value,
        /** True if the stage was explicit in the program or generated to wrap some other content. */
        explicit: boolean,
        content: (Output | null)[],
        background: Color,
        frame: Form | undefined = undefined,
        size: number,
        face: SupportedFace,
        place: Place | undefined = undefined,
        name: TextLang | string,
        description: TextLang | undefined,
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

    getSays(): Say[] {
        const says: Say[] = [];
        for (const child of this.content) {
            if (child instanceof Say) says.push(child);
            else if (child instanceof Group) says.push(...child.getSays());
        }
        return says;
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
            : locales.getUnannotatedText((l) =>
                  getFirstText(l.output.Group.names),
              );
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            this._description = locales
                .concretize(
                    (l) => l.output.Stage.defaultDescription,
                    this.content.length,
                    this.name instanceof TextLang ? this.name.text : undefined,
                    this.frame?.getDescription(locales),
                    this.pose.getDescription(locales).trim(),
                )
                .toText()
                .trim();
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

    /** Scan all references to fonts and load them as necessary. */
    gatherFaces(set: Set<SupportedFace>) {
        if (this.face) set.add(this.face);
        for (const content of this.content)
            if (content) content.gatherFaces(set);
        return set;
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
            const base = name;
            const existingNameCount = this.names.get(base);
            if (existingNameCount !== undefined) {
                // Find the first suffix that doesn't collide with any already-assigned name.
                let count = existingNameCount + 1;
                while (this.names.has(base + count)) count++;
                name = base + count;
            }
            newName = name;
            // Remember this name to prevent duplicates.
            this.names.set(base, (existingNameCount ?? 0) + 1);
            if (newName !== base) this.names.set(newName, 1);
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
    // Lists are produced when a program (or any block) has multiple non-Bind
    // result expressions. Decide how to render based on the list's contents.
    if (value instanceof ListValue) {
        if (namer === undefined) namer = new NameGenerator();

        // Convert each list element to an Output. Categorize: Stages get
        // priority (existing behavior); other Outputs (Phrase/Group/Shape/Say)
        // get collected for stacking.
        const stages: Stage[] = [];
        const outputs: Output[] = [];
        for (const val of value.values) {
            const output = toOutput(evaluator, val, namer);
            if (output instanceof Stage) stages.push(output);
            else if (output !== undefined) outputs.push(output);
        }

        // If any element was a Stage, prefer the last one — preserves prior
        // behavior for programs that explicitly produce multiple Stages.
        if (stages.length > 0) return stages.at(-1);

        // No stages and no other outputs: nothing renderable.
        if (outputs.length === 0) return undefined;

        // One non-Stage output: wrap it directly in a Stage, just like a
        // program that returned that single Phrase/Group.
        if (outputs.length === 1)
            return wrapInStage(evaluator, value, outputs[0], namer);

        // Multiple non-Stage outputs: collect them into a Group with a Stack
        // arrangement, then wrap that Group in a Stage. This is the same
        // implicit wrap idea as a single Phrase becoming a Stage — just
        // extended to "multiple things become a stacked group on a Stage."
        const stackArrangement = new Stack(
            value,
            new TextValue(value.creator, '|'),
            new NumberValue(value.creator, new Decimal(1)),
        );
        const group = new Group(
            value,
            stackArrangement,
            outputs,
            undefined, // matter
            undefined, // size
            undefined, // face
            undefined, // place
            namer.getName(undefined, value),
            undefined, // description
            false, // selectable
            undefined, // background
            new DefinitePose(
                value,
                undefined,
                1,
                new Place(value, 0, 0, 0),
                0,
                1,
                false,
                false,
            ),
            undefined, // entering
            undefined, // resting
            undefined, // moving
            undefined, // exiting
            0, // duration
            DefaultStyle,
        );
        return wrapInStage(evaluator, value, group, namer);
    }

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
        const frame = toForm(project, getOutputInput(value, 1));

        const gravity = toNumber(getOutputInput(value, 22)) ?? DefaultGravity;

        const {
            size,
            face: font,
            place,
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
                  description,
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
            : wrapInStage(evaluator, value, type, namer);
    }
}

/** Build a default Stage that contains a single child Output. The child can be
 *  a single Phrase produced directly by the program, or a synthesized Group
 *  collecting multiple Phrases from a list result. */
function wrapInStage(
    evaluator: Evaluator,
    value: Value,
    child: Output,
    namer: NameGenerator,
): Stage {
    return new Stage(
        value,
        false,
        [child],
        new Color(value, new Decimal(100), new Decimal(0), new Decimal(0)),
        undefined,
        DefaultSize,
        evaluator.getLocales()[0].ui.font.app,
        undefined,
        namer.getName(undefined, value),
        undefined,
        child.selectable,
        new DefinitePose(
            value,
            new Color(value, new Decimal(0), new Decimal(0), new Decimal(0)),
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

export function toDecimal(value: Value | undefined): Decimal | undefined {
    return value instanceof NumberValue ? value.num : undefined;
}

export function toNumber(value: Value | undefined): number | undefined {
    return toDecimal(value)?.toNumber();
}

export function toBoolean(value: Value | undefined): boolean | undefined {
    return value instanceof BoolValue ? value.bool : undefined;
}
