import toStructure from '../native/toStructure';
import { TYPE_SYMBOL } from '@parser/Symbols';
import Structure from '@runtime/Structure';
import type Value from '@runtime/Value';
import { getBind } from '@locale/getBind';
import Output from './Output';
import type Pose from './Pose';
import { toPose } from './Pose';
import { toDecimal } from './Stage';
import Text from '../runtime/Text';
import Map from '../runtime/Map';
import Number from '../runtime/Number';
import Transition from './Transition';
import type Place from './Place';
import type { TransitionSequence } from './OutputAnimation';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';

export function createSequenceType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Sequence, TYPE_SYMBOL)}(
        ${getBind(
            locales,
            (locale) => locale.output.Sequence.poses
        )}•{ % : Pose }
        ${getBind(locales, (locale) => locale.output.Type.duration)}•#s: 0.25s
        ${getBind(locales, (locale) => locale.output.Type.style)}•${locales
        .map((locale) =>
            Object.values(locale.output.Easing).map((id) => `"${id}"`)
        )
        .flat()
        .join('|')}: "${Object.values(locales[0].output.Easing)[0]}"
        ${getBind(
            locales,
            (locale) => locale.output.Sequence.count
        )}•1x|2x|3x|4x|5x: 1x
    )
`);
}

type SequenceStep = { percent: number; pose: Pose };

export default class Sequence extends Output {
    readonly count: number;
    readonly poses: SequenceStep[];
    readonly duration: number;
    readonly style: string;

    constructor(
        value: Value,
        count: number,
        poses: SequenceStep[],
        duration: number,
        style: string
    ) {
        super(value);

        this.count = count;
        this.poses = poses;
        this.duration = duration;
        this.style = style;
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
        size?: number
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
                    this.style
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
                        this.style
                    )
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
}

export function toSequence(project: Project, value: Value | undefined) {
    if (
        !(
            value instanceof Structure &&
            value.type === project.shares.output.sequence
        )
    )
        return undefined;

    const count = toDecimal(value.resolve('count'));
    const duration = toDecimal(value.resolve('duration'));
    const style = value.resolve('style');

    const poses = value.resolve('poses');
    if (!(poses instanceof Map)) return undefined;

    // Convert the map to a sorted list of steps
    const steps: SequenceStep[] = [];

    for (const [key, value] of poses.values) {
        const percent = key instanceof Number ? key.toNumber() : undefined;
        const pose = toPose(project, value);
        if (percent !== undefined && pose !== undefined)
            steps.push({ percent, pose });
    }

    // Sort the steps in increasing percents.
    steps.sort((a, b) => a.percent - b.percent);

    return count && duration && style instanceof Text && poses
        ? new Sequence(
              value,
              count.toNumber(),
              steps,
              duration.toNumber(),
              style.text
          )
        : undefined;
}
