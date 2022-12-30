import toStructure from '../native/toStructure';
import List from '../runtime/List';
import Structure from '../runtime/Structure';
import type Value from '../runtime/Value';
import Output from './Output';
import Pose, { toPose } from './Pose';
import { toDecimal } from './Verse';

export const SequenceType = toStructure(`
    •Sequence/eng(
        count/eng•#x
        poses/eng…•Pose|Sequence
    )
`);

export type SequenceKind = 'entry' | 'between' | 'during' | 'exit';

export default class Sequence extends Output {
    readonly count: number;
    readonly poses: (Pose | Sequence)[];

    constructor(value: Value, count: number, poses: (Pose | Sequence)[]) {
        super(value);

        this.count = count;
        this.poses = poses;
    }

    getFirstPose(): Pose | undefined {
        const first = this.poses[0];
        if (first === undefined) return undefined;
        else if (first instanceof Sequence) return first.getFirstPose();
        else return first;
    }

    getSequenceOfPose(pose: Pose): Sequence | undefined {
        for (const p of this.poses) {
            if (p instanceof Pose) {
                if (p === pose) return this;
            } else {
                const seq = p.getSequenceOfPose(pose);
                if (seq) return seq;
            }
        }
        return undefined;
    }

    getNextPose(current: Pose): Pose | undefined {
        // Is the current pose in this sequence?
        const index = this.poses.indexOf(current);

        // If so, what's next?
        if (index >= 0) {
            const next = this.poses[index + 1];
            // A pose! Return it.
            if (next instanceof Pose) return next;
            // A sequence! Ask for it's first pose.
            else if (next instanceof Sequence) return next.getFirstPose();
        }
        // If it's not in this sequence, recursively check if a subsequence has it.
        else {
            for (const sequence of this.poses.filter(
                (p) => p instanceof Sequence
            ) as Sequence[]) {
                const sequenceNext = sequence.getNextPose(current);
                if (sequenceNext) return sequenceNext;
            }
        }
        // No next pose.
        return undefined;
    }

    getNextPoseThat(currentPose: Pose, predicate: (pose: Pose) => boolean) {
        let next: Pose | undefined = currentPose;
        do {
            next = this.getNextPose(next);
            if (next === undefined) return undefined;
            if (predicate(next)) return next;
        } while (true);
    }

    asSequence() {
        return this;
    }
}

export function toSequence(value: Value | undefined) {
    if (!(value instanceof Structure && value.type === SequenceType))
        return undefined;

    const count = toDecimal(value.resolve('count'));
    const poses = value.resolve('poses');
    if (!(poses instanceof List)) return undefined;
    const mapped = poses.values.map(
        (val) => toPose(val) ?? toSequence(val)
    ) as (Pose | Sequence | undefined)[];
    if (mapped.some((val) => val === undefined)) return undefined;

    return count && poses instanceof List
        ? new Sequence(value, count.toNumber(), mapped as (Pose | Sequence)[])
        : undefined;
}
