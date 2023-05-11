/** The tutorial for learning the programming language. */
import type Locale from '../locale/Locale';
import type Unit from './Unit';

export function getTutorial(translation: Locale): Unit[] {
    return [
        {
            id: 'welcome',
            sources: [
                "Phrase('👋🏻' rest: Sequence({0%: Pose(tilt: -5°) 50%: Pose(tilt: 5°) 100%: Pose(tilt: -5°)} duration: 1s))",
            ],
            lessons: [
                {
                    concept: translation.node.Program,
                    steps: [
                        {
                            sources: ['"$1"'],
                        },
                    ],
                },
                {
                    concept: translation.node.Evaluate,
                    steps: [
                        {
                            sources: [''],
                        },
                    ],
                },
            ],
        },
        {
            id: 'numbers',
            sources: ['1'],
            lessons: [
                {
                    concept: translation.node.MeasurementLiteral,
                    steps: [
                        {
                            sources: [''],
                        },
                    ],
                },
            ],
        },
    ];
}
