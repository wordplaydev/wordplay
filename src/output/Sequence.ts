import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import toStructure from '../basis/toStructure';
import type Project from '../db/projects/Project';
import type Locales from '../locale/Locales';
import MapValue from '../values/MapValue';
import TextValue from '../values/TextValue';
import type { TransitionSequence } from './OutputAnimation';
import type Place from './Place';
import type Pose from './Pose';
import { toPose } from './Pose';
import { toDecimal } from './Stage';
import Transition from './Transition';
import Valued, { getOutputInputs } from './Valued';

const MaxCount = 5;

export function createSequenceType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Sequence, TYPE_SYMBOL)}(
        ${getBind(
            locales,
            (locale) => locale.output.Sequence.poses,
        )}•{ % : Pose }
        ${getBind(
            locales,
            (locale) => locale.output.Sequence.duration,
        )}•#s: 0.25s
        ${getBind(locales, (locale) => locale.output.Sequence.style)}•${locales
            .getLocales()
            .map((locale) =>
                Object.values(locale.output.Easing).map((id) => `"${id}"`),
            )
            .flat()
            .join('|')}: "${
            Object.values(locales.getLocales()[0].output.Easing)[0]
        }"
        ${getBind(locales, (locale) => locale.output.Sequence.count)}•${[
            ...Array(MaxCount + 1).keys(),
        ]
            .slice(1)
            .map((n) => `${n}x`)
            .join('|')}: 1x
        ${getBind(locales, (locale) => locale.output.Sequence.description)}•"""..."": ""
    )
`);
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

    getDescription(locales: Locales): string {
        // If a custom description is provided, use it
        if (this.description) {
            return this.description;
        }

        // Fallback to using the description of the first pose
        const firstPose = this.getFirstPose();
        if (firstPose) {
            return firstPose.getDescription(locales);
        }

        // Return an empty string if no poses or description
        return '';
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

    const [poses, durationVal, style, countVal, descriptionVal] = getOutputInputs(value);

    const count = toDecimal(countVal);
    const duration = toDecimal(durationVal);
    const description = descriptionVal instanceof TextValue ? descriptionVal.text : '';

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
              description
          )
        : undefined;
}
