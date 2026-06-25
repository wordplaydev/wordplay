// Import Database first: it eagerly constructs the DB singleton, which must finish before
// ConceptIndex pulls in HowToDatabase (otherwise a circular import leaves it half-defined).
import '@db/Database';
import type Concept from '@concepts/Concept';
import ConceptIndex from '@concepts/ConceptIndex';
import HowConcept from '@concepts/HowConcept';
import { parseHowTo } from '@concepts/HowTo';
import NodeConcept from '@concepts/NodeConcept';
import { Purpose } from '@concepts/Purpose';
import StructureConcept from '@concepts/StructureConcept';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/** A minimal valid how-to whose body contains a single code example. Examples are their own
 * paragraph (blank line before) delimited by `\` on its own line, matching the authoring format. */
function howTo(id: string, example: string): { id: string; text: string } {
    return { id, text: `Demo\n\n\\\n${example}\n\\\n\nmove-phrase` };
}

/** A how-to whose body @links a concept by name in its text (no example code). */
function howToWithLink(
    id: string,
    conceptName: string,
): { id: string; text: string } {
    return { id, text: `Demo\n\nSee @${conceptName} for details.\n\nmove-phrase` };
}

function findScalar(index: ConceptIndex, purpose: (typeof Purpose)[keyof typeof Purpose]) {
    return index.concepts.find(
        (c): c is StructureConcept =>
            c instanceof StructureConcept && c.purpose === purpose,
    );
}

function indexWith(...howTos: { id: string; text: string }[]) {
    const project = Project.make(
        null,
        'test',
        new Source('test', '_'),
        [],
        DefaultLocale,
    );
    const hows = howTos
        .map(({ id, text }) => parseHowTo(id, text).how)
        .filter((h) => h !== null);
    return ConceptIndex.make(project, DefaultLocales, hows, undefined);
}

function findStructure(index: ConceptIndex, name: string) {
    return index.concepts.find(
        (c): c is StructureConcept =>
            c instanceof StructureConcept &&
            c.getName(DefaultLocales, false) === name,
    );
}

function findNode(index: ConceptIndex, descriptor: string) {
    return index.concepts.find(
        (c): c is NodeConcept =>
            c instanceof NodeConcept &&
            c.template.getDescriptor() === descriptor,
    );
}

function ids(concepts: Concept[]) {
    return concepts.map((c) =>
        c instanceof HowConcept ? c.how.id : c.getName(DefaultLocales, false),
    );
}

test('a how-to that uses a structure in example code matches that concept', () => {
    // No @link to Phrase — it appears solely in the example's source code.
    const index = indexWith(howTo('animate-phrase', "Phrase('hi')"));
    const phrase = findStructure(index, 'Phrase');
    expect(phrase).toBeDefined();
    if (phrase) expect(ids(index.getHowTosForConcept(phrase))).toContain(
        'animate-phrase',
    );
});

test('node-type concepts (Bind) used in example code are matched, not just names', () => {
    // The example binds a name — its Bind node should match the Bind language concept.
    const index = indexWith(howTo('animate-phrase', 'count: 1\ncount'));
    const bind = findNode(index, 'Bind');
    expect(bind).toBeDefined();
    if (bind) expect(ids(index.getHowTosForConcept(bind))).toContain(
        'animate-phrase',
    );
});

test('scalar concepts are included (no longer suppressed)', () => {
    // Probe the index for the Number concept's name, then author a how-to that @links it.
    const probeName = findScalar(indexWith(), Purpose.Numbers)?.getName(
        DefaultLocales,
        false,
    );
    expect(probeName).toBeDefined();
    if (probeName === undefined) return;
    const index = indexWith(howToWithLink('animate-phrase', probeName));
    const number = findScalar(index, Purpose.Numbers);
    if (number) expect(ids(index.getHowTosForConcept(number))).toContain(
        'animate-phrase',
    );
});

test('matches are ranked by reference count and capped at 10', () => {
    // 12 how-tos reference Phrase; the cap keeps 10. One references it more, so it ranks first.
    const valid = [
        'animate-phrase',
        'move-phrase',
        'custom-characters',
        'styling-text',
        'animated-scene',
        'interactive-scene',
        'layering-images',
        'shake-phrase',
        'video-grid',
        'track-points',
        'track-game-state',
        'offer-choices',
    ];
    const many = valid.map((id, i) =>
        // The first how-to references Phrase three times; the rest once.
        howTo(id, i === 0 ? "Phrase(Phrase(Phrase('x')))" : "Phrase('x')"),
    );
    const index = indexWith(...many);
    const phrase = findStructure(index, 'Phrase');
    expect(phrase).toBeDefined();
    if (phrase) {
        const result = index.getHowTosForConcept(phrase);
        expect(result.length).toBe(10);
        expect(ids(result)[0]).toBe('animate-phrase');
    }
});
