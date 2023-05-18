import Emotion from '../../../lore/Emotion';
import type { UnitNames } from '../../Locale';

const WRITE_DOC = 'TBD';

export const UnitOverviews: UnitNames = {
    welcome: {
        name: 'Welcome',
        overview: [
            [
                Emotion.Bored,
                `...

                Oh, hi.

                Are you new here?

                My name is **ƒ**.
                
                I'm so bored...
                `,
            ],
            [
                Emotion.Curious,
                `Why? Oh, is this your first time visiting **Versa**?

                I'm bored because we lost our inspiration. 
                We *love* putting on shows like dances, stories, images, and games.
                
                But we can't do it without people.
                They have the fun ideas, and we know how to dance.
                
                But I haven't seen a person in ages.
                `,
            ],
            [
                Emotion.Eager,
                `Wait... you're a person?

                Could you ... inspire us?

                I mean, it's not easy.
                We're a quirky community, and people who come here to direct us sometimes find our rules and customs a bit strange.

                But those that commit to learning about us usually figure it out just fine.

                Do you... want to learn?
                `,
            ],
            [
                Emotion.Excited,
                `That's wonderful!
                I'm so excited.

                I'm happy to show you around and introduce you to everyone.
                There are soooo many cool things to see here, I'm sure you're going to love it.
                `,
            ],
        ],
    },
    values: {
        name: 'Values',
        overview: [[Emotion.TBD, WRITE_DOC]],
    },
    input: { name: 'Inputs', overview: [[Emotion.TBD, WRITE_DOC]] },
    collections: {
        name: 'Collections',
        overview: [[Emotion.TBD, WRITE_DOC]],
    },
    names: { name: 'Names', overview: [[Emotion.TBD, WRITE_DOC]] },
    output: { name: 'Output', overview: [[Emotion.TBD, WRITE_DOC]] },
    functions: { name: 'Functions', overview: [[Emotion.TBD, WRITE_DOC]] },
    structures: { name: 'Structures', overview: [[Emotion.TBD, WRITE_DOC]] },
    types: { name: 'Types', overview: [[Emotion.TBD, WRITE_DOC]] },
    docs: { name: 'Documentation', overview: [[Emotion.TBD, WRITE_DOC]] },
};
