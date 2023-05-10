import type Unit from './Unit';
import type Lesson from './Lesson';
import type Step from './Step';

export default class Progress {
    readonly tutorial: Unit[];
    /** The description ID of the unit */
    readonly unit: string;
    /** The concept ID of the lesson, or undefined if the unit hasn't been started */
    readonly concept: string | undefined;
    /** The instruction number of the lesson, or undefined if the lesson hasn't been started */
    readonly step: number | undefined;

    constructor(
        tutorial: Unit[],
        unit: string,
        concept: string | undefined,
        step: number | undefined
    ) {
        this.tutorial = tutorial;
        this.unit = unit;
        this.concept = concept;
        this.step = step;
    }

    getUnit(): Unit | undefined {
        return this.tutorial.find((unit) => unit.id === this.unit);
    }

    getLesson(): Lesson | undefined {
        const unit = this.getUnit();
        return unit === undefined
            ? undefined
            : unit.lessons.find((lesson) => lesson.concept === this.concept);
    }

    getStep(): Step | undefined {
        const lesson = this.getLesson();
        return lesson && this.step ? lesson.steps[this.step] : undefined;
    }

    /** Generate a project ID suitable for this point in the tutorial */
    getProjectID() {
        return `${this.unit}${this.concept ? `-${this.concept}` : ''}`;
    }

    previousLesson(): Progress | undefined {
        return this.moveConcept(-1, true) ?? this.moveUnit(-1);
    }

    nextLesson(): Progress | undefined {
        return this.moveConcept(1, true) ?? this.moveUnit(1);
    }

    previousStep(): Progress | undefined {
        return (
            this.moveStep(-1) ??
            this.moveConcept(-1, false) ??
            this.moveUnit(-1)
        );
    }

    nextStep(): Progress | undefined {
        return (
            this.moveStep(1) ?? this.moveConcept(1, true) ?? this.moveUnit(1)
        );
    }

    moveConcept(direction: -1 | 1, start: boolean) {
        let unit = this.getUnit();
        if (unit === undefined) return undefined;

        let concept = this.concept;
        let step = this.step;
        if (direction < 0 && concept === undefined) {
            unit = this.getNextUnit(direction);
            if (unit) {
                const lesson = unit.lessons.at(-1);
                if (lesson) {
                    concept = lesson.concept;
                    step = lesson.steps.length - 1;
                }
            } else return undefined;
        } else if (
            concept !== undefined &&
            direction > 0 &&
            unit.lessons.findIndex((lesson) => lesson.concept === concept) ===
                unit.lessons.length - 1
        ) {
            unit = this.getNextUnit(direction);
            if (unit) {
                const lesson = unit.lessons.at(0);
                if (lesson) {
                    concept = lesson.concept;
                    step = 0;
                }
            } else return undefined;
        } else {
            const lesson =
                unit.lessons[
                    unit.lessons.findIndex(
                        (lesson) => lesson.concept === concept
                    ) + direction
                ];
            if (lesson) {
                concept = lesson.concept;
                step = start ? 0 : direction < 0 ? lesson.steps.length - 1 : 0;
            } else {
                concept = undefined;
                step = undefined;
            }
        }

        return new Progress(this.tutorial, unit.id, concept, step);
    }

    getNextUnit(direction: -1 | 1): Unit | undefined {
        const index = this.tutorial.findIndex((unit) => unit.id === this.unit);
        return this.tutorial[index + direction];
    }

    moveUnit(direction: -1 | 1): Progress | undefined {
        const unit = this.getNextUnit(direction);
        return unit === undefined
            ? undefined
            : new Progress(this.tutorial, unit.id, undefined, 0);
    }

    moveStep(direction: -1 | 1): Progress | undefined {
        const lesson = this.getLesson();
        return lesson === undefined ||
            (this.step ?? -1) + direction < 0 ||
            (this.step ?? -1) + direction >= lesson.steps.length
            ? undefined
            : new Progress(
                  this.tutorial,
                  this.unit,
                  this.concept,
                  (this.step ?? 0) + direction
              );
    }
}
