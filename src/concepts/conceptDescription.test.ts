import { describe, expect, test } from 'vitest';
import Project from '@db/projects/Project';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import firstSentence from '@locale/firstSentence';
import Source from '@nodes/Source';
import { getBasisConcepts, getNodeConcepts } from './DefaultConcepts';

function setup() {
    const source = new Source('untitled', '');
    const project = Project.make(null, 'untitled', source, [], DefaultLocale);
    const context = project.getContext(source);
    const locales = new Locales(concretize, [DefaultLocale], DefaultLocale);
    return { context, locales };
}

describe('firstSentence', () => {
    test('returns the first sentence of multi-sentence text', () => {
        expect(firstSentence('A list of values. It can grow.', 'en')).toBe(
            'A list of values.',
        );
    });
    test('returns single-sentence text unchanged (trimmed)', () => {
        expect(firstSentence('Just one thought ', 'en')).toBe(
            'Just one thought',
        );
    });
    test('falls back to host default on a malformed locale tag', () => {
        expect(firstSentence('Hello there.', 'not a tag')).toBe('Hello there.');
    });
});

describe('Concept.getDescription', () => {
    // Notes are now uniformly the first sentence of a concept's docs (the
    // `description` field is reserved for ARIA). This holds for node concepts too.
    test('a node concept derives its note from the first sentence of its doc', () => {
        const { context, locales } = setup();
        const bind = getNodeConcepts(context).find(
            (c) => c.template.getDescriptor() === 'Bind',
        );
        expect(bind).toBeDefined();
        const expected = firstSentence(
            bind?.getDocs(locales)[0]?.asFirstParagraph().toText() ?? '',
            locales.getLocaleString(),
        );
        expect(bind?.getDescription(locales)?.toText()).toBe(expected);
        // The note is the doc, not the templated ARIA description.
        expect(bind?.getDescription(locales)?.toText()).not.toContain('$');
    });

    test('every concept note is the first sentence of its docs', () => {
        const { context, locales } = setup();
        const concepts = [
            ...getNodeConcepts(context),
            ...getBasisConcepts(context.getBasis(), locales, context),
        ];
        for (const concept of concepts) {
            const paragraph = concept.getDocs(locales)[0]?.asFirstParagraph();
            if (paragraph === undefined) continue;
            const expected = firstSentence(
                paragraph.toText(),
                locales.getLocaleString(),
            );
            expect(concept.getDescription(locales)?.toText()).toBe(expected);
        }
    });
});
