import type Unit from './Unit';
import type Lesson from './Lesson';
import type Segment from './Segment';

export default class Progress {
    readonly tutorial: Unit[];
    /** The description ID of the unit */
    readonly unit: string;
    /** The concept ID of the lesson */
    readonly concept: string;
    /** The instruction number of the lesson */
    readonly segment: number;

    constructor(
        tutorial: Unit[],
        unit?: string,
        concept?: string,
        instruction?: number
    ) {
        this.tutorial = tutorial;
        this.unit = unit ?? tutorial[0].id;
        this.concept = concept ?? tutorial[0].lessons[0].concept;
        this.segment = instruction ?? 0;
    }

    getUnit(): Unit {
        return (
            this.tutorial.find((unit) => unit.id === this.unit) ??
            this.tutorial[0]
        );
    }

    getLesson(): Lesson {
        const unit = this.getUnit();
        return (
            unit.lessons.find((lesson) => lesson.concept === this.concept) ??
            unit.lessons[0]
        );
    }

    getSegment(): Segment {
        const lesson = this.getLesson();
        return lesson.segments[this.segment] ?? lesson.segments[0];
    }

    /** Generate a project ID suitable for this point in the tutorial */
    getID() {
        return `${this.unit}-${this.concept}`;
    }
}
