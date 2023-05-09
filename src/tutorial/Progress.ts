import type Unit from './Unit';
import type Lesson from './Lesson';
import type Segment from './Segment';

export default class Progress {
    readonly tutorial: Unit[];
    /** The description ID of the unit */
    readonly unit: string;
    /** The concept ID of the lesson, or undefined if the unit hasn't been started */
    readonly concept: string | undefined;
    /** The instruction number of the lesson, or undefined if the lesson hasn't been started */
    readonly segment: number;

    constructor(
        tutorial: Unit[],
        unit: string,
        concept: string | undefined,
        instruction: number
    ) {
        this.tutorial = tutorial;
        this.unit = unit;
        this.concept = concept;
        this.segment = instruction;
    }

    getUnit(): Unit {
        return (
            this.tutorial.find((unit) => unit.id === this.unit) ??
            this.tutorial[0]
        );
    }

    getLesson(): Lesson | undefined {
        const unit = this.getUnit();
        return unit.lessons.find((lesson) => lesson.concept === this.concept);
    }

    getSegment(): Segment | undefined {
        const lesson = this.getLesson();
        return lesson && this.segment
            ? lesson.segments[this.segment]
            : undefined;
    }

    /** Generate a project ID suitable for this point in the tutorial */
    getProjectID() {
        return `${this.unit}${this.concept ? `-${this.concept}` : ''}`;
    }
}
