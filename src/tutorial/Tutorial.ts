/** The tutorial for learning the programming language. */
import type Translation from '../translation/Translation';
import type Unit from './Unit';

export function getTutorial(translation: Translation): Unit[] {
    return [
        {
            id: 'welcome',
            sources: [
                "Phrase('👋🏻' rest: Sequence({0%: Pose(tilt: -5°) 50%: Pose(tilt: 5°) 100%: Pose(tilt: -5°)} duration: 1s))",
            ],
            lessons: [translation.node.Program, translation.node.Evaluate],
        },
        {
            id: 'numbers',
            sources: ['1'],
            lessons: [translation.node.MeasurementLiteral],
        },
    ];
}
