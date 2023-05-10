/** The tutorial for learning the programming language. */
import Source from '../nodes/Source';
import type Unit from './Unit';

const Tutorial: Unit[] = [
    {
        id: 'welcome',
        sources: [
            new Source(
                'welcome',
                "Phrase('👋🏻' rest: Sequence({0%: Pose(tilt: -5°) 50%: Pose(tilt: 5°) 100%: Pose(tilt: -5°)} duration: 1s))"
            ),
        ],
        lessons: [
            {
                concept: 'Program',
                steps: [
                    {
                        sources: [new Source('main', '')],
                        checks: [],
                    },
                    {
                        sources: [new Source('main', '"hello world"')],
                        checks: [],
                    },
                ],
            },
            {
                concept: 'Evaluate',
                steps: [
                    {
                        sources: [new Source('main', 'Phrase("hi")')],
                        checks: [],
                    },
                ],
            },
        ],
    },
    {
        id: 'numbers',
        sources: [new Source('numbers', '1')],
        lessons: [
            {
                concept: 'MeasurementLiteral',
                steps: [
                    {
                        sources: [new Source('main', '1')],
                        checks: [],
                    },
                ],
            },
        ],
    },
];

export default Tutorial;
