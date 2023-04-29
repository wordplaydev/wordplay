/** The tutorial for learning the programming language. */
import Source from '../nodes/Source';
import type Unit from './Unit';

const Tutorial: Unit[] = [
    {
        id: 'welcome',
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
