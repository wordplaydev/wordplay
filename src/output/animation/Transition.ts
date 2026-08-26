import type Place from '@output/Place/Place';
import type Pose from '@output/animation/Pose';

/**
 * Represents a transition between two poses, including a duration and style.
 * We compile a Phrase or Group's settings into a sequence of these.
 * */
export default class Transition {
    readonly place: Place | undefined;
    readonly rotation: number | undefined;
    readonly size: number | undefined;
    readonly pose: Pose;
    readonly duration: number;
    readonly style: string | undefined;
    /**
     * True only for a transition a `Sequence` compiled, false for the lead-in and
     * lead-out `OutputAnimation` builds around one — the prior rest pose `rest()`
     * prepends, the first rest pose `enter()` appends, the `rest ?? move` `move()`
     * ends on. Only a sequence's own steps are moments the creator keyed, so only
     * they can sound a pose's music; guessing that from the index is what this
     * exists to avoid.
     */
    readonly step: boolean;

    constructor(
        place: Place | undefined,
        size: number | undefined,
        pose: Pose,
        duration: number,
        style: string | undefined,
        step = false,
    ) {
        this.place = place;
        this.size = size;
        this.pose = pose;
        this.duration = duration;
        this.style = style;
        this.step = step;
    }

    withPlace(place: Place) {
        return new Transition(
            place,
            this.size,
            this.pose,
            this.duration,
            this.style,
            this.step,
        );
    }

    withDuration(duration: number) {
        return new Transition(
            this.place,
            this.size,
            this.pose,
            duration,
            this.style,
            this.step,
        );
    }
}
