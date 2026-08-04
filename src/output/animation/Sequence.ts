import { getBind } from '@locale/getBind';
import { FUNCTION_SYMBOL, SHARE_SYMBOL, TYPE_SYMBOL } from '@parser/Symbols';
import {
    animationBody,
    Animations,
    reference,
    type AnimationKey,
} from '@output/animation/DefaultSequences';
import type Context from '@nodes/Context';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Block from '@nodes/Block';
import Evaluate from '@nodes/Evaluate';
import type Node from '@nodes/Node';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import toStructure from '@basis/toStructure';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import MapValue from '@values/MapValue';
import TextValue from '@values/TextValue';
import type { TransitionSequence } from '@output/animation/OutputAnimation';
import type Place from '@output/Place/Place';
import type Pose from '@output/animation/Pose';
import { toPose } from '@output/animation/Pose';
import { toDecimal } from '@output/Output/Stage';
import Transition from '@output/animation/Transition';
import Valued, { getOutputInputs } from '@output/Output/Valued';

const MaxCount = 5;

/** `Pose`'s locale-stable name, for the `poses` map type. */
const PoseName = reference((locale) => locale.output.Pose);

/** The type of the `style` input: every locale's easing names, unioned. */
function styleType(locales: Locales): string {
    return locales
        .getLocales()
        .map((locale) =>
            Object.values(locale.output.Easing).map(
                (id) => `"${id}"/${locale.language}`,
            ),
        )
        .flat()
        .join('|');
}

/**
 * The `duration`, `style`, `count`, and `description` inputs, shared by the `Sequence`
 * structure and by every animation static, which takes them after its own inputs and passes
 * them straight through. Generated once so the two can't drift apart.
 */
function passThroughInputs(locales: Locales): string {
    return `${getBind(locales, (locale) => locale.output.Sequence.duration)}•#s: 0.25s
        ${getBind(locales, (locale) => locale.output.Sequence.style)}•${styleType(
            locales,
        )}: "${Object.values(locales.getLocales()[0].output.Easing)[0]}"
        ${getBind(locales, (locale) => locale.output.Sequence.count)}•${[
            ...Array(MaxCount + 1).keys(),
        ]
            .slice(1)
            .map((n) => `${n}x`)
            .join('|')}: 1x
        ${getBind(locales, (locale) => locale.output.Sequence.description)}•'': ""`;
}

/**
 * One `↑ ƒ` static per predefined animation, so `Sequence.sway()` builds a whole sequence
 * rather than the poses map a creator would then have to wrap. Its own inputs come first and
 * the pass-through inputs last, which is also what makes migrating an old
 * `Sequence.sway(5° 1s)` a matter of concatenating the two argument lists.
 */
function animationStatics(locales: Locales): string {
    return Animations.map((animation) => {
        const inputs = [
            ...animation.inputs.map(
                (input) =>
                    `${getBind(locales, input.bind)}•${input.type}: ${input.value}`,
            ),
            passThroughInputs(locales),
        ].join('\n        ');
        return `${getBind(
            locales,
            animation.bind,
            `${SHARE_SYMBOL} ${FUNCTION_SYMBOL} `,
        )}(
        ${inputs}
    ) ${animationBody(animation.poses)}`;
    }).join('\n\n    ');
}

export function createSequenceType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Sequence, TYPE_SYMBOL)}(
        ${getBind(
            locales,
            (locale) => locale.output.Sequence.poses,
        )}•{ % : ${PoseName} }
        ${passThroughInputs(locales)}
    ) (
    ${animationStatics(locales)}
    )
`);
}

/**
 * True if the given function is one of `Sequence`'s predefined-animation statics — i.e. this
 * is a `Sequence.sway()` rather than a `Sequence({…})`. Checked against the block's
 * statements directly so callers on hot paths don't need a Context.
 */
export function isAnimation(project: Project, fun: Node): boolean {
    const block = project.shares.output.Sequence.expression;
    return (
        fun instanceof FunctionDefinition &&
        block instanceof Block &&
        block.statements.includes(fun)
    );
}

/**
 * True if the given expression makes a Sequence — either `Sequence({…})` or one of the
 * predefined animations, `Sequence.sway()`. The palette treats the two the same, so anywhere
 * it used to ask whether an evaluate *is* the Sequence structure should ask this instead.
 */
export function makesSequence(
    project: Project,
    expression: Node,
    context: Context,
): boolean {
    if (!(expression instanceof Evaluate)) return false;
    const fun = expression.getFunction(context);
    return (
        fun === project.shares.output.Sequence ||
        (fun !== undefined && isAnimation(project, fun))
    );
}

/**
 * The animation statics on a project's `Sequence`, keyed by animation key. Matched by name
 * rather than position so a reordered {@link Animations} table can't silently mismatch.
 */
export function getAnimations(
    project: Project,
    context: Context,
): Map<AnimationKey, FunctionDefinition> {
    const statics =
        project.shares.output.Sequence.getStaticDefinitions(context);
    const animations = new Map<AnimationKey, FunctionDefinition>();
    for (const animation of Animations) {
        const definition = statics.find(
            (s): s is FunctionDefinition =>
                s instanceof FunctionDefinition && s.hasName(animation.key),
        );
        if (definition !== undefined) animations.set(animation.key, definition);
    }
    return animations;
}

type SequenceStep = { percent: number; pose: Pose };

export default class Sequence extends Valued {
    readonly count: number;
    readonly poses: SequenceStep[];
    readonly duration: number;
    readonly style: string;
    readonly description: string;

    constructor(
        value: Value,
        count: number,
        poses: SequenceStep[],
        duration: number,
        style: string,
        description: string = '',
    ) {
        super(value);

        this.count = count;
        this.poses = poses;
        this.duration = duration;
        this.style = style;
        this.description = description;
    }

    /**
     * A sequence can compile into three possible things:
     * 1) nothing, since it's empty
     * 2) a single pose, if only one is provided,
     * 3) one or more transitions between two or more poses.
     */
    compile(
        place?: Place,
        defaultPose?: Pose,
        size?: number,
    ): TransitionSequence | undefined {
        // No poses? No pose or transition.
        if (this.poses.length === 0) return undefined;
        else if (this.poses.length === 1) {
            // Only one pose? Just animate the duration with the same pose.
            return [
                new Transition(place, size, this.poses[0].pose, 0, this.style),
                new Transition(
                    place,
                    size,
                    this.poses[0].pose,
                    this.duration,
                    this.style,
                ),
            ];
        }
        // Otherwise, to a list of transitions.
        else {
            // How many times will this repeat?
            // We need to know here to divide up time accordingly.
            const count = Math.max(1, Math.min(Math.round(this.count), 10));
            const transitions: Transition[] = [];
            for (let index = 0; index < this.poses.length; index++) {
                const current = this.poses[index];
                const previous = this.poses[index - 1];
                transitions.push(
                    new Transition(
                        place,
                        size,
                        defaultPose
                            ? defaultPose.with(current.pose)
                            : current.pose,
                        previous === undefined
                            ? 0
                            : (this.duration *
                                  (current.percent - previous.percent)) /
                              count,
                        this.style,
                    ),
                );
            }

            // Duplicate the transitions based on the count
            // (but with a reasonable limit).
            let repetitions: Transition[] = [];
            for (let i = 0; i < count; i++)
                repetitions = repetitions.concat(transitions);

            return repetitions as TransitionSequence;
        }
    }

    getFirstPose(): Pose | undefined {
        return this.poses[0]?.pose;
    }

    /** True if this sequence's underlying value equals the given sequence's. */
    equals(sequence: Sequence): boolean {
        return this.value.isEqualTo(sequence.value);
    }

    getDescription(locales: Locales): string {
        return this.description && this.description.trim() !== ''
            ? this.description
            : '';
    }
}

export function toSequence(project: Project, value: Value | undefined) {
    if (
        !(
            value instanceof StructureValue &&
            value.type === project.shares.output.Sequence
        )
    )
        return undefined;

    const [poses, durationVal, style, countVal, description] =
        getOutputInputs(value);

    const count = toDecimal(countVal);
    const duration = toDecimal(durationVal);

    if (!(poses instanceof MapValue)) return undefined;

    // Convert the map to a sorted list of steps
    const steps: SequenceStep[] = [];

    for (const [key, value] of poses.values) {
        const percent = key instanceof NumberValue ? key.toNumber() : undefined;
        const pose = toPose(project, value);
        if (percent !== undefined && pose !== undefined)
            steps.push({ percent, pose });
    }

    // Sort the steps in increasing percents.
    steps.sort((a, b) => a.percent - b.percent);

    return count && duration && style instanceof TextValue && poses
        ? new Sequence(
              value,
              count.toNumber(),
              steps,
              duration.toNumber(),
              style.text,
              description instanceof TextValue ? description.text : '',
          )
        : undefined;
}
