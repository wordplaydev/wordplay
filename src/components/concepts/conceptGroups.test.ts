import {
    canRecycleDraggedNode,
    getConceptGroups,
} from '#components/concepts/conceptGroups.ts';
import ConceptIndex from '#concepts/ConceptIndex.ts';
import { must } from '#util/nullable.ts';
import NodeConcept from '#concepts/NodeConcept.ts';
import StructureConcept from '#concepts/StructureConcept.ts';
import type { HeaderAndExplanationText } from '#locale/UITexts.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import Bind from '#nodes/Bind.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Source from '#nodes/Source.ts';
import parseExpression from '#parser/parseExpression.ts';
import { toTokens } from '#parser/toTokens.ts';
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
    const item = must(source.find(NumberLiteral), 'NumberLiteral');
    expect(canRecycleDraggedNode(p, [item])).toBe(true);
});

test('a required expression can be recycled (blanks to a placeholder)', () => {
    // Dragging the `1` out of `1 + 2` leaves `_ + 2` — a Minor placeholder conflict, not a rejection.
    const { source, project: p } = project('1 + 2');
    const one = must(source.find(NumberLiteral), 'NumberLiteral');
    expect(canRecycleDraggedNode(p, [one])).toBe(true);
});

test('a removal that leaves an unknown name is still recyclable (semantic conflicts warn, not block)', () => {
    // Removing the binding `a: 1` leaves `a + 2` referencing an undefined name. That's a semantic
    // mistake the creator can repair in place — the removal is permitted and warned, not blocked.
    const { source, project: p } = project('a: 1\na + 2');
    const bind = must(source.find(Bind), 'Bind');
    expect(canRecycleDraggedNode(p, [bind])).toBe(true);
});

test('the root of a source cannot be recycled (removing it changes nothing)', () => {
    // Dragging the whole program/root block over the bin can't replace the root via descendant
    // replacement, so it would be a no-op — treat it as not removable.
    const { source, project: p } = project('1 + 2');
    expect(canRecycleDraggedNode(p, [source.expression])).toBe(false);
});

test('a node not rooted in a source cannot be recycled', () => {
    const { project: p } = project('1');
    // A rootless expression (e.g. a palette concept dragged from the Wellspring/Guide).
    const rootless = parseExpression(toTokens('1'));
    expect(canRecycleDraggedNode(p, [rootless])).toBe(false);
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

test('every output concept is in exactly one named group', () => {
    const { p, index } = patternsSetup();
    const groups = getConceptGroups(Purpose.Outputs, index, p);
    const types = p.shares.output;
    // Interfaces are shown as their implementers, and Result belongs to Patterns.
    const unlisted = [
        types.Form,
        types.Arrangement,
        types.Effect,
        types.Result,
    ];
    for (const concept of index.getPrimaryConceptsWithPurpose(
        Purpose.Outputs,
    )) {
        if (
            concept instanceof StructureConcept &&
            unlisted.includes(concept.definition)
        )
            continue;
        expect(
            groups.filter((group) => group.concepts.includes(concept)).length,
            concept.getName(DefaultLocales, false),
        ).toBe(1);
    }
});

test('output concepts are grouped by what they are for', () => {
    const { p, index } = patternsSetup();
    const groups = getConceptGroups(Purpose.Outputs, index, p);
    const headerOf = (name: string) =>
        groups
            .find((group) =>
                group.concepts.some(
                    (c) => c.getName(DefaultLocales, false) === name,
                ),
            )
            ?.header(DefaultLocale);
    const docs = DefaultLocale.ui.docs.header;
    expect(headerOf('Blur')).toBe(docs.effects);
    expect(headerOf('Vignette')).toBe(docs.effects);
    expect(headerOf('Music')).toBe(docs.sound);
    expect(headerOf('Note')).toBe(docs.sound);
    expect(headerOf('Say')).toBe(docs.sound);
    expect(headerOf('Matter')).toBe(docs.physics);
    expect(headerOf('Place')).toBe(docs.location);
    // Values that streams report are documented with the inputs instead.
    for (const name of ['Thing', 'Rebound', 'Downbeat'])
        expect(headerOf(name), name).toBeUndefined();
    expect(groups.map((group) => group.header(DefaultLocale))).toEqual([
        DefaultLocale.ui.docs.purposes.Outputs,
        docs.forms,
        docs.arrangements,
        docs.location,
        docs.appearance,
        docs.animation,
        docs.physics,
        docs.effects,
        docs.sound,
    ]);
});

test('inputs are grouped by what they sense, each stream just before the values it reports', () => {
    const { p, index } = patternsSetup();
    const groups = getConceptGroups(Purpose.Inputs, index, p);
    const names = (header: HeaderAndExplanationText) =>
        groups
            .find((group) => group.header(DefaultLocale) === header)
            ?.concepts.map((c) => c.getName(DefaultLocales, false)) ?? [];
    const docs = DefaultLocale.ui.docs.header;
    expect(names(docs.time).slice(0, 3)).toEqual(['Time', 'Now', 'Moment']);
    expect(names(docs.motion)).toEqual([
        'Motion',
        'Collision',
        'Rebound',
        'Direction',
    ]);
    expect(names(docs.listening).slice(-3)).toEqual([
        'Beat',
        'Downbeat',
        'Part',
    ]);
    expect(names(docs.camera)).toContain('Thing');
    expect(names(docs.camera)).toContain('Expression');
    expect(names(docs.scenes)).toEqual(['Scene', 'Spotlight', 'Slate']);
    for (const concept of index.getPrimaryConceptsWithPurpose(Purpose.Inputs))
        expect(
            groups.filter((group) => group.concepts.includes(concept)).length,
            concept.getName(DefaultLocales, false),
        ).toBe(1);
});
