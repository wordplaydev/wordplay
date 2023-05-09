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
                segments: [
                    {
                        sources: [new Source('main', '')],
                        checks: [],
                    },
                ],
            },
        ],
    },
];

export default Tutorial;
