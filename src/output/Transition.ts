import type Place from './Place';
import type Pose from './Pose';

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

    constructor(
        place: Place | undefined,
        rotation: number | undefined,
        size: number | undefined,
        pose: Pose,
        duration: number,
        style: string | undefined
    ) {
        this.place = place;
        this.rotation = rotation;
        this.size = size;
        this.pose = pose;
        this.duration = duration;
        this.style = style;
    }

    withPlace(place: Place) {
        return new Transition(
            place,
            this.rotation,
            this.size,
            this.pose,
            this.duration,
            this.style
        );
    }

    withRotation(rotation: number) {
        return new Transition(
            this.place,
            rotation,
            this.size,
            this.pose,
            this.duration,
            this.style
        );
    }

    withDuration(duration: number) {
        return new Transition(
            this.place,
            this.rotation,
            this.size,
            this.pose,
            duration,
            this.style
        );
    }
}
