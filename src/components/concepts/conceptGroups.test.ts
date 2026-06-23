import {
    canRecycleDraggedNode,
    getConceptGroups,
} from '@components/concepts/conceptGroups';
import ConceptIndex from '@concepts/ConceptIndex';
import NodeConcept from '@concepts/NodeConcept';
import { Purpose } from '@concepts/Purpose';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Bind from '@nodes/Bind';
import NumberLiteral from '@nodes/NumberLiteral';
import Source from '@nodes/Source';
import parseExpression from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';
import { expect, test } from 'vitest';

function project(code: string) {
    const source = new Source('test', code);
    return {
        source,
        project: Project.make(null, 'test', source, [], DefaultLocale),
    };
}

test('a list item can be recycled (removed outright)', () => {
    const { source, project: p } = project('[1 2 3]');
    const item = source.find<NumberLiteral>(NumberLiteral);
    expect(canRecycleDraggedNode(p, item)).toBe(true);
});

test('a required expression can be recycled (blanks to a placeholder)', () => {
    // Dragging the `1` out of `1 + 2` leaves `_ + 2` — a Minor placeholder conflict, not a rejection.
    const { source, project: p } = project('1 + 2');
    const one = source.find<NumberLiteral>(NumberLiteral);
    expect(canRecycleDraggedNode(p, one)).toBe(true);
});

test('a removal that would break the program cannot be recycled', () => {
    // Removing the binding `a: 1` leaves `a + 2` referencing an undefined name — a blocking
    // UnknownName conflict — so recycling is rejected.
    const { source, project: p } = project('a: 1\na + 2');
    const bind = source.find<Bind>(Bind);
    expect(canRecycleDraggedNode(p, bind)).toBe(false);
});

test('the root of a source cannot be recycled (removing it changes nothing)', () => {
    // Dragging the whole program/root block over the bin can't replace the root via descendant
    // replacement, so it would be a no-op — treat it as not removable.
    const { source, project: p } = project('1 + 2');
    expect(canRecycleDraggedNode(p, source.expression)).toBe(false);
});

test('a node not rooted in a source cannot be recycled', () => {
    const { project: p } = project('1');
    // A rootless expression (e.g. a palette concept dragged from the Wellspring/Guide).
    const rootless = parseExpression(toTokens('1'));
    expect(canRecycleDraggedNode(p, rootless)).toBe(false);
});

// The pattern sublanguage is its own guide section (Purpose.Patterns), next to
// Text, so it no longer pollutes the Text page with ~20 complex constructs.
function patternsSetup() {
    const { project: p } = project('_');
    const index = ConceptIndex.make(p, DefaultLocales, undefined, undefined);
    return { p, index };
}

test('the Patterns section gathers the constructs, the ≈/⌕ operators, and Result', () => {
    const { p, index } = patternsSetup();
    // Collect every name form (symbolic `≈`/`⌕` and worded `matches`/`search`).
    const names = getConceptGroups(Purpose.Patterns, index, p)
        .flatMap((g) => g.concepts)
        .flatMap((c) => [
            c.getName(DefaultLocales, true),
            c.getName(DefaultLocales, false),
        ]);
    // A sample of the pattern constructs.
    for (const construct of ['pattern', 'sequence', 'character class'])
        expect(
            names.some((n) => n.includes(construct)),
            `Patterns should include ${construct}`,
        ).toBe(true);
    // The two operators (pulled from the Text structure) and the Result struct.
    expect(names).toContain('matches');
    expect(names).toContain('search');
    expect(names.some((n) => n.includes('Result'))).toBe(true);
});

test('the Text section no longer lists pattern constructs', () => {
    const { index } = patternsSetup();
    const textPatternNodes = index
        .getPrimaryConceptsWithPurpose(Purpose.Text)
        .filter(
            (c) =>
                c instanceof NodeConcept &&
                c.template.getDescriptor().startsWith('Pattern'),
        );
    expect(textPatternNodes).toEqual([]);
});
