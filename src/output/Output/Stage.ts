import { getBind } from '@locale/getBind';
import { describeColorLocalized } from '@output/Color/BasicColors';
import { STAGE_SYMBOL } from '@parser/Symbols';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import Decimal from 'decimal.js';
import {
    SupportedFontsFamiliesType,
    type SupportedFace,
} from '@basis/faces/Fonts';
import { FallbackFontFamilies } from '@basis/faces/FallbackFonts';
import toStructure from '@basis/toStructure';
import type Locales from '@locale/Locales';
import { getFirstText } from '@locale/LocaleText';
import type Evaluator from '@runtime/Evaluator';
import Color from '@output/Color/Color';
import { Form } from '@output/Output/Shape/Form';
import { toForm } from '@output/Output/Shape/toForm';
import Group from '@output/Output/Group';
import Music from '@output/Music/Music';
import Output, { DefaultStyle } from '@output/Output/Output';
import Place from '@output/Place/Place';
import Pose, { DefinitePose } from '@output/animation/Pose';
import type RenderContext from '@output/RenderContext';
import Say from '@output/Output/Say';
import type Sequence from '@output/animation/Sequence';
import Shape from '@output/Output/Shape/Shape';
import { Stack } from '@output/Arrangement/Stack';
import { getTypeStyle, toOutput, toOutputList } from '@output/Output/toOutput';
import { getOutputInput } from '@output/Output/Valued';

export const DefaultGravity = 9.8;

/** A multiple of ordinary air resistance. 1 is the resistance every project has
 *  always had; 0 is space, where things coast forever, which is what an orbit
 *  needs. Kept a multiplier rather than a rate so the Matter.js-derived constant
 *  it scales stays an implementation detail (see AirDamping in Physics.ts). */
export const DefaultAir = 1;

/** The fallback face chain appended to every rendered face. A literal (not
 * var(--wordplay-fallback-fonts)) because it's also used in canvas font
 * strings for text measurement, where CSS variables can't resolve. */
export const CSSFallbackFaces = `"Noto Color Emoji", "Noto Sans", ${FallbackFontFamilies}, sans-serif`;
export const DefaultSize = 1;

export function createStageType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Stage, '•')} Output(
    ${getBind(
        locales,
        (locale) => locale.output.Stage.content,
    )}•[Phrase|Shape|Group|Say|Music]
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
            Object.values(locale.output.Easing).map(
                (id) => `"${id}"/${locale.language}`,
            ),
        )
        .flat()
        .join('|')}: "${DefaultStyle}"
    ${getBind(
        locales,
        (locale) => locale.output.Stage.gravity,
    )}•#m/s^2: ${DefaultGravity}m/s^2
    ${getBind(
        locales,
        (locale) => locale.output.Stage.overlay,
    )}•[Phrase|Shape|Group|Say|Music]|ø: ø
    ${getBind(locales, (locale) => locale.output.Stage.air)}•#: ${DefaultAir}
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
    readonly air: number;
    /** Content pinned flat to the screen (a HUD), rendered above the world
     *  content and unaffected by the camera or depth. */
    readonly overlay: (Output | null)[];

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
        name: TextValue | string,
        description: TextValue | undefined,
        selectable: boolean,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moving: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration = 0,
        style: string | undefined = 'zippy',
        gravity: number,
        overlay: (Output | null)[] = [],
        air: number = DefaultAir,
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
        this.air = air;
        this.overlay = overlay;
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

    /** All the music in the content, in source order. Like getSays, this
     * consciously skips the overlay. */
    getMusic(): Music[] {
        const music: Music[] = [];
        for (const child of this.content) {
            if (child instanceof Music) music.push(child);
            else if (child instanceof Group) music.push(...child.getMusic());
        }
        return music;
    }

    getLayout(context: RenderContext) {
        const places: [Output, Place][] = [];
        let left = 0,
            right = 0,
            bottom = 0,
            top = 0;
        // Seeded at the stage plane, matching how the x/y bounds seed at the origin: a
        // stage with nothing placed forward reports 0, which is where content lives.
        let nearest = 0;
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
                // Both the child's own z and whatever it reports from inside itself, since
                // z is absolute rather than relative to this place.
                if (place.z < nearest) nearest = place.z;
                if (layout.nearest < nearest) nearest = layout.nearest;
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
            nearest,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getShortDescription(locales: Locales) {
        return this.name instanceof TextValue
            ? this.name.text
            : locales.getPrimaryPlainText((l) =>
                  getFirstText(l.output.Group.names),
              );
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            const bg = this.background;
            const colorDescription = bg
                ? describeColorLocalized(
                      locales,
                      bg.lightness.toNumber(),
                      bg.chroma.toNumber(),
                      bg.hue.toNumber(),
                  )
                : undefined;
            this._description = locales
                .concretize((l) => l.output.Stage.defaultDescription, {
                    count: this.content.length,
                    name:
                        this.name instanceof TextValue
                            ? this.name.text
                            : undefined,
                    frame: this.frame?.getDescription(locales),
                    pose: this.pose.getDescription(locales).trim(),
                    color: colorDescription,
                })
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

/** Builds a Stage that has already been read, given any extra content to put on it. */
type StageBuilder = (extra: Output[]) => Stage;

/**
 * Read an explicit Stage structure, but hand back a function that builds it
 * rather than the Stage itself. Everything that reads the value happens here,
 * in source order — including every name the NameGenerator hands out, for the
 * stage's content, its overlay, and the stage itself. Only `new Stage(…)`
 * waits, so a caller that finds more output *after* reading this stage (a
 * program whose value is a list holding a Stage and a Music) can put that
 * output on the stage without copying it and without mutating it.
 */
function toStageBuilder(
    evaluator: Evaluator,
    value: StructureValue,
    namer: NameGenerator,
): StageBuilder | undefined {
    const project = evaluator.project;

    const possibleGroups = getOutputInput(value, 0);
    const content =
        possibleGroups instanceof ListValue
            ? toOutputList(evaluator, possibleGroups, namer)
            : toOutput(evaluator, possibleGroups, namer);
    const frame = toForm(project, getOutputInput(value, 1));

    // Both reach Rapier, which has no defence against a non-finite value, so
    // they are read through toFiniteNumber. Air is clamped as well, because a
    // negative damping is exponential growth rather than a mirrored behavior
    // the way upward gravity is.
    const gravity = toFiniteNumber(getOutputInput(value, 22), DefaultGravity);
    const air = Math.max(
        0,
        toFiniteNumber(getOutputInput(value, 24), DefaultAir),
    );

    const overlayInput = getOutputInput(value, 23);
    const overlay =
        overlayInput instanceof ListValue
            ? toOutputList(evaluator, overlayInput, namer)
            : [];

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

    if (
        content === undefined ||
        background === undefined ||
        duration === undefined ||
        style === undefined ||
        !pose ||
        selectable === undefined
    )
        return undefined;

    // Name the stage only once we know it's well formed, so a malformed one
    // consumes no name — which is where the name was generated before.
    const stageName = namer.getName(name?.text, value);
    const own = Array.isArray(content) ? content : [content];

    return (extra) =>
        new Stage(
            value,
            true,
            [...own, ...extra],
            background,
            frame,
            size ?? DefaultSize,
            font ?? evaluator.getLocales()[0].ui.font.app,
            place,
            stageName,
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
            overlay,
            air,
        );
}

export function toStage(
    evaluator: Evaluator,
    value: Value,
    namer?: NameGenerator,
): Stage | undefined {
    const project = evaluator.project;

    // Create a name generator to guarantee unique default names for all TypeOutput.
    if (namer === undefined) namer = new NameGenerator();

    // Lists are produced when a program (or any block) has multiple non-Bind
    // result expressions. Decide how to render based on the list's contents.
    if (value instanceof ListValue) {
        // Read the list in source order, so every generated name is the one the
        // program got before. Stage elements are read but not yet built: a stage
        // may have to carry output that appears after it in the list.
        const builders: StageBuilder[] = [];
        const outputs: Output[] = [];
        for (const val of value.values) {
            if (
                val instanceof StructureValue &&
                val.type === project.shares.output.Stage
            ) {
                const build = toStageBuilder(evaluator, val, namer);
                if (build) builders.push(build);
            } else {
                const output = toOutput(evaluator, val, namer);
                if (output !== undefined) outputs.push(output);
            }
        }

        // A stage in the list is *the* stage: it names the background, frame,
        // camera, and gravity, which nothing else in the list can. Everything
        // else the program made rides along on it rather than being dropped —
        // flat and in source order, which is the treatment it would have had if
        // the creator had typed it into the stage's own content list. An
        // earlier stage is still discarded, since its background and frame have
        // no merge rule and stages can't nest. (Values that aren't output at
        // all — a number, some text — are still dropped; coercing those to
        // Phrases is a language decision, not this one.)
        const build = builders.at(-1);
        if (build) return build(outputs);

        // No stages and no other outputs: nothing renderable.
        if (outputs.length === 0) return undefined;

        // Outputs that are heard rather than seen (Music, Say) never belong in the
        // stack: they'd contribute a stack padding of empty space around nothing,
        // and a Group box the creator can select but not see. They ride along as
        // direct Stage children instead, which is all getMusic() and the speech
        // synthesizer need.
        const seen = outputs.filter((output) => output.occupiesSpace());
        const heard = outputs.filter((output) => !output.occupiesSpace());

        // At most one visible output: no arrangement to make, so put everything
        // on the Stage directly, just like a program that returned one Phrase.
        if (seen.length <= 1)
            return wrapInStage(evaluator, value, [...seen, ...heard], namer);

        // Multiple visible outputs: collect them into a Group with a Stack
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
            seen,
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
        return wrapInStage(evaluator, value, [group, ...heard], namer);
    }

    // Otherwise, we require a structure value.
    if (!(value instanceof StructureValue)) return undefined;

    // If it's a stage, get outputs to show.
    if (value.type === project.shares.output.Stage) {
        const build = toStageBuilder(evaluator, value, namer);
        return build ? build([]) : undefined;
    }
    // Just a phrase or group? Wrap it in a stage.
    else {
        const type = toOutput(evaluator, value, namer);
        return type === undefined
            ? undefined
            : wrapInStage(evaluator, value, [type], namer);
    }
}

/** Build a default Stage around the given child Outputs. The children can be a
 *  single Phrase produced directly by the program, or a synthesized Group
 *  collecting multiple Phrases from a list result, plus any heard-not-seen
 *  outputs (Music, Say) the program produced alongside them. */
function wrapInStage(
    evaluator: Evaluator,
    value: Value,
    children: Output[],
    namer: NameGenerator,
): Stage {
    // Selectability comes from what's visible, since that's what a creator clicks.
    const visible = children.find((child) => child.occupiesSpace());
    return new Stage(
        value,
        false,
        children,
        new Color(value, new Decimal(100), new Decimal(0), new Decimal(0)),
        undefined,
        DefaultSize,
        evaluator.getLocales()[0].ui.font.app,
        undefined,
        namer.getName(undefined, value),
        undefined,
        (visible ?? children[0]).selectable,
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

/** Wrap a stage's overlay outputs in a synthetic Stage so the flat overlay/HUD
 *  layer can be rendered and animated by its own Animator, independent of the
 *  world camera. Returns undefined when there's no overlay content. The distinct
 *  name gives it a distinct HTML id so its DOM and animations never collide with
 *  the world stage. Inherits the world stage's size/face/pose so HUD text
 *  matches. */
export function toOverlayStage(
    stage: Stage,
    defaultFace: SupportedFace,
): Stage | undefined {
    if (stage.overlay.length === 0) return undefined;
    const value = stage.value;
    return new Stage(
        value,
        false,
        stage.overlay,
        stage.back,
        undefined,
        stage.size ?? DefaultSize,
        stage.face ?? defaultFace,
        undefined,
        `${stage.getName()}-overlay`,
        undefined,
        false,
        stage.pose,
        undefined,
        undefined,
        undefined,
        undefined,
        0,
        DefaultStyle,
        DefaultGravity,
        [],
    );
}

export function toDecimal(value: Value | undefined): Decimal | undefined {
    return value instanceof NumberValue ? value.num : undefined;
}

export function toNumber(value: Value | undefined): number | undefined {
    return toDecimal(value)?.toNumber();
}

/** A number a program wrote, or the fallback when it wrote none, `!#`, or `∞`.
 *  A non-finite number handed to the physics engine spreads to every position
 *  in its world within one step, which empties the stage. */
export function toFiniteNumber(
    value: Value | undefined,
    fallback: number,
): number {
    const number = toNumber(value);
    return number !== undefined && Number.isFinite(number) ? number : fallback;
}

export function toBoolean(value: Value | undefined): boolean | undefined {
    return value instanceof BoolValue ? value.bool : undefined;
}
