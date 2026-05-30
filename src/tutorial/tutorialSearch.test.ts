import { describe, expect, test } from 'vitest';
import { buildTutorialSearch, type SearchableTutorial } from './tutorialSearch';
import { searchItems } from '@util/search';

const L = 'en';

// Lines are [speaker, emotion, ...text]; a performance line starts with a
// PerformanceMode ('fit'/'fix'/'edit'/'conflict'/'use') and must be skipped.
const tutorial: SearchableTutorial = {
    acts: [
        {
            title: 'First Act',
            scenes: [
                {
                    title: 'Hello Scene',
                    subtitle: 'a friendly greeting',
                    lines: [
                        ['Emcee', 'happy', 'Welcome to the gesture tutorial'],
                        null, // a pause
                        ['Emcee', 'happy', 'Phrases can be animated on stage'],
                        ['fit', 'some performance content'], // skipped
                    ],
                },
            ],
        },
    ],
};

const records = buildTutorialSearch(tutorial, L);
const search = (q: string) => searchItems(records, q, L);

describe('buildTutorialSearch', () => {
    test('matches a scene by its subtitle (priority 1, points to scene start)', () => {
        const [target, match] = search('greeting')[0];
        expect(match[3]).toBe(1);
        expect(target).toMatchObject({ act: 1, scene: 1, pause: 1 });
    });

    test('matches dialog text (priority 2)', () => {
        const [target, match] = search('gesture')[0];
        expect(match[3]).toBe(2);
        expect(target).toMatchObject({ act: 1, scene: 1, pause: 1 });
    });

    test('counts pauses so a later line points to the right place', () => {
        const [target] = search('animated')[0];
        // The "animated" line comes after one pause, so pause index is 2.
        expect(target.pause).toBe(2);
    });

    test('tolerates a typo in dialog (fuzzy)', () => {
        expect(search('animted').some(([, m]) => m[3] === 2)).toBe(true);
    });

    test('skips performance lines', () => {
        expect(search('performance')).toEqual([]);
    });

    test('builds a readable label', () => {
        expect(search('gesture')[0][0].label).toBe(
            'First Act — a friendly greeting',
        );
    });
});

describe('multilingual tutorial search', () => {
    // A Spanish translation of the same tutorial: same act/scene structure,
    // translated text. The view concatenates records from every selected
    // locale's tutorial, so content in any language is searchable.
    const spanish: SearchableTutorial = {
        acts: [
            {
                title: 'Primer Acto',
                scenes: [
                    {
                        title: 'Escena de saludo',
                        subtitle: 'un saludo amistoso',
                        lines: [['Emcee', 'happy', 'Bienvenido al tutorial']],
                    },
                ],
            },
        ],
    };

    const records = [
        ...buildTutorialSearch(tutorial, L),
        ...buildTutorialSearch(spanish, L),
    ];

    test('finds content in either language, pointing to the same scene', () => {
        const en = searchItems(records, 'greeting', L);
        const es = searchItems(records, 'saludo', L);
        expect(en[0][0]).toMatchObject({ act: 1, scene: 1 });
        expect(es[0][0]).toMatchObject({ act: 1, scene: 1 });
    });
});
