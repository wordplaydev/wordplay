import { describe, expect, test } from 'vitest';
import Concept from '@concepts/Concept';
import { Purpose } from '@concepts/Purpose';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import {
    activeSection,
    currentConcept,
    currentSearch,
    navigateSection,
    popTo,
    pushConcept,
    reconcileSearch,
    remapConcepts,
    sameHistory,
    type GuideHistory,
} from './GuideHistory';

const project = Project.make(null, 'test', Source.make(''), [], DefaultLocale);
const context = project.getContext(project.getMain());

/** Always throws; typed `never` so it satisfies any abstract method's return type. */
function unused(): never {
    throw new Error('unused');
}

/** A minimal Concept whose identity is its only meaningful trait. The abstract
 *  methods other than isEqualTo are never exercised by GuideHistory, so they throw. */
class FakeConcept extends Concept {
    readonly label: string;
    constructor(label: string) {
        super(Purpose.Types, undefined, context);
        this.label = label;
    }
    getCharacter() {
        return unused();
    }
    getCharacterName() {
        return unused();
    }
    getEmotion() {
        return unused();
    }
    hasName() {
        return unused();
    }
    getRepresentation() {
        return unused();
    }
    getNames() {
        return unused();
    }
    getName() {
        return unused();
    }
    getDocs() {
        return unused();
    }
    getNodes() {
        return unused();
    }
    getText() {
        return unused();
    }
    getSubConcepts() {
        return unused();
    }
    isEqualTo(concept: Concept): boolean {
        return concept === this;
    }
}

const A = new FakeConcept('A');
const B = new FakeConcept('B');

describe('GuideHistory', () => {
    test('current concept / search read the top of the stack', () => {
        expect(currentConcept([])).toBeUndefined();
        expect(currentSearch([])).toBeUndefined();
        const h: GuideHistory = [
            { kind: 'search', query: 'color' },
            { kind: 'concept', concept: A },
        ];
        expect(currentConcept(h)).toBe(A);
        expect(currentSearch(h)).toBeUndefined();
        expect(currentSearch([{ kind: 'search', query: 'x' }])).toBe('x');
    });

    test('pushConcept always appends', () => {
        const h = pushConcept(pushConcept([], A), B);
        expect(h.map((p) => (p.kind === 'concept' ? p.concept : null))).toEqual(
            [A, B],
        );
    });

    test('reconcileSearch: push from home, replace in place, pop on empty', () => {
        // Push a new search from home.
        const a = reconcileSearch([], 'co');
        expect(a).toEqual([{ kind: 'search', query: 'co' }]);
        // Refine the existing top search in place (no new entry).
        const b = reconcileSearch(a, 'col');
        expect(b).toEqual([{ kind: 'search', query: 'col' }]);
        // Clearing the box pops the trailing search.
        expect(reconcileSearch(b, '')).toEqual([]);
    });

    test('reconcileSearch returns the same reference when nothing changes', () => {
        const search: GuideHistory = [{ kind: 'search', query: 'color' }];
        expect(reconcileSearch(search, 'color')).toBe(search);
        const conceptOnly: GuideHistory = [{ kind: 'concept', concept: A }];
        // Empty query with a concept top: no trailing search to pop.
        expect(reconcileSearch(conceptOnly, '')).toBe(conceptOnly);
    });

    test('reconcileSearch pushes a search above a concept (so back returns to it)', () => {
        const h: GuideHistory = [{ kind: 'concept', concept: A }];
        expect(reconcileSearch(h, 'bar')).toEqual([
            { kind: 'concept', concept: A },
            { kind: 'search', query: 'bar' },
        ]);
    });

    test('popTo truncates to and including the index', () => {
        const h: GuideHistory = [
            { kind: 'search', query: 'q' },
            { kind: 'concept', concept: A },
            { kind: 'concept', concept: B },
        ];
        expect(popTo(h, 0)).toEqual([{ kind: 'search', query: 'q' }]);
        expect(popTo(h, 1)).toHaveLength(2);
    });

    test('remapConcepts remaps concepts, drops unresolved, keeps searches', () => {
        const h: GuideHistory = [
            { kind: 'search', query: 'q' },
            { kind: 'concept', concept: A },
            { kind: 'concept', concept: B },
        ];
        const mapped = remapConcepts(h, (c) => (c === A ? B : undefined));
        expect(mapped).toEqual([
            { kind: 'search', query: 'q' },
            { kind: 'concept', concept: B },
        ]);
    });

    test('sameHistory compares locations pairwise', () => {
        const h1: GuideHistory = [
            { kind: 'search', query: 'q' },
            { kind: 'concept', concept: A },
        ];
        const h2: GuideHistory = [
            { kind: 'search', query: 'q' },
            { kind: 'concept', concept: A },
        ];
        const h3: GuideHistory = [
            { kind: 'search', query: 'q' },
            { kind: 'concept', concept: B },
        ];
        expect(sameHistory(h1, h2)).toBe(true);
        expect(sameHistory(h1, h3)).toBe(false);
        expect(sameHistory(h1, [])).toBe(false);
    });

    test('activeSection returns the topmost section', () => {
        expect(activeSection([])).toBeUndefined();
        const h: GuideHistory = [
            { kind: 'section', mode: 'language', purpose: Purpose.Outputs },
            { kind: 'concept', concept: A },
        ];
        expect(activeSection(h)).toEqual({
            mode: 'language',
            purpose: Purpose.Outputs,
        });
    });

    test('navigateSection modifies the top section in place (moving between sections)', () => {
        const h: GuideHistory = [
            { kind: 'section', mode: 'howto', purpose: Purpose.Outputs },
        ];
        expect(navigateSection(h, 'language', Purpose.Numbers)).toEqual([
            { kind: 'section', mode: 'language', purpose: Purpose.Numbers },
        ]);
    });

    test('navigateSection adds a section when moving away from a concept', () => {
        const h: GuideHistory = [
            { kind: 'section', mode: 'language', purpose: Purpose.Outputs },
            { kind: 'concept', concept: A },
        ];
        expect(navigateSection(h, 'language', Purpose.Lists)).toEqual([
            { kind: 'section', mode: 'language', purpose: Purpose.Outputs },
            { kind: 'concept', concept: A },
            { kind: 'section', mode: 'language', purpose: Purpose.Lists },
        ]);
    });

    test('remapConcepts preserves section locations', () => {
        const h: GuideHistory = [
            { kind: 'section', mode: 'language', purpose: Purpose.Outputs },
            { kind: 'concept', concept: A },
        ];
        const mapped = remapConcepts(h, (c) => (c === A ? B : undefined));
        expect(mapped).toEqual([
            { kind: 'section', mode: 'language', purpose: Purpose.Outputs },
            { kind: 'concept', concept: B },
        ]);
    });
});
