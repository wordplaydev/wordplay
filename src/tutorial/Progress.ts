import type Unit from './Unit';
import type Lesson from './Lesson';
import type Step from './Step';
import type { TutorialProgress } from '../db/Creator';

export default class Progress {
    readonly tutorial: Unit[];
    /** The description ID of the unit */
    readonly unit: string;
    /** The number of lesson in the unit's list of lessons. 1 is the first lesson, 0 represents the unit start page */
    readonly lesson: number;
    /** The number of the step int ehinstruction number of the lesson, or undefined if the lesson hasn't been started */
    readonly step: number;

    constructor(tutorial: Unit[], unit: string, lesson: number, step: number) {
        this.tutorial = tutorial;
        this.unit = unit;
        this.lesson = lesson;
        this.step = step;
    }

    getUnit(): Unit | undefined {
        return this.tutorial.find((unit) => unit.id === this.unit);
    }

    getLesson(): Lesson | undefined {
        const unit = this.getUnit();
        return unit?.lessons[this.lesson - 1];
    }

    getStep(): Step | undefined {
        const lesson = this.getLesson();
        return lesson ? lesson.steps[this.step] : undefined;
    }

    /** Generate a project ID suitable for this point in the tutorial */
    getProjectID() {
        return `${this.unit}-${this.lesson}-${this.step}`;
    }

    toObject(): TutorialProgress {
        return {
            unit: this.unit,
            lesson: this.lesson,
            step: this.step,
        };
    }

    previousLesson(): Progress | undefined {
        return this.moveLesson(-1, true) ?? this.moveUnit(-1);
    }

    nextLesson(): Progress | undefined {
        return this.moveLesson(1, true) ?? this.moveUnit(1);
    }

    previousStep(): Progress | undefined {
        return (
            this.moveStep(-1) ?? this.moveLesson(-1, false) ?? this.moveUnit(-1)
        );
    }

    nextStep(): Progress | undefined {
        return this.moveStep(1) ?? this.moveLesson(1, true) ?? this.moveUnit(1);
    }

    moveLesson(direction: -1 | 1, start: boolean) {
        let unit = this.getUnit();
        if (unit === undefined) return undefined;

        let lesson = this.lesson;
        let step = this.step;
        if (direction < 0 && lesson === 0) {
            unit = this.getNextUnit(direction);
            if (unit) {
                lesson = unit.lessons.length - 1;
                step = unit.lessons[lesson].steps.length;
            } else return undefined;
        } else if (lesson === unit.lessons.length && direction > 0) {
            unit = this.getNextUnit(direction);
            if (unit) {
                lesson = 0;
                step = 0;
            } else return undefined;
        } else {
            lesson = lesson + direction;
            if (unit.lessons[lesson] !== undefined) {
                step = start
                    ? 0
                    : direction < 0
                    ? unit.lessons[lesson].steps.length - 1
                    : 0;
            } else {
                step = 0;
            }
        }

        return new Progress(this.tutorial, unit.id, lesson, step);
    }

    getNextUnit(direction: -1 | 1): Unit | undefined {
        const index = this.tutorial.findIndex((unit) => unit.id === this.unit);
        return this.tutorial[index + direction];
    }

    moveUnit(direction: -1 | 1): Progress | undefined {
        const unit = this.getNextUnit(direction);
        return unit === undefined
            ? undefined
            : new Progress(this.tutorial, unit.id, 0, 0);
    }

    moveStep(direction: -1 | 1): Progress | undefined {
        const lesson = this.getLesson();
        return lesson === undefined ||
            (this.step ?? -1) + direction < 0 ||
            (this.step ?? -1) + direction >= lesson.steps.length - 1
            ? undefined
            : new Progress(
                  this.tutorial,
                  this.unit,
                  this.lesson,
                  (this.step ?? 0) + direction
              );
    }
}
