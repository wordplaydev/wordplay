import Templates from '@concepts/Templates';
import UnusedBind from '@conflicts/UnusedBind';
import DefaultLocales from '@locale/DefaultLocales';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import UnparsableExpression from '@nodes/UnparsableExpression';
import UnparsableType from '@nodes/UnparsableType';
import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Example from '@nodes/Example';
import { Basis } from '@basis/Basis';
import Locales from '@locale/Locales';
import concretize from '@locale/concretize';

const basis = Basis.getLocalizedBasis(DefaultLocales);

// Two locales can share a language but define different names (zh-CN vs zh-TW), so the basis
// cache has to key on region too, or whichever loads second silently gets the other's basis.
test('the basis cache distinguishes locales sharing a language', () => {
    const forRegion = (region: 'CN' | 'TW') =>
        Basis.getLocalizedBasis(
            new Locales(
                concretize,
                [{ ...DefaultLocale, language: 'zh', regions: [region] }],
                DefaultLocale,
            ),
        );
    expect(forRegion('CN')).not.toBe(forRegion('TW'));
    // The same locale still hits the cache rather than rebuilding.
    expect(forRegion('CN')).toBe(forRegion('CN'));
});

const source = new Source('basis', '');
const project = Project.make(null, 'test', source, [], DefaultLocale);
const context = project.getContext(source);

function checkBasisNodes(node: Node) {
    // Check for syntax errors
    const unparsables = node
        .nodes()
        .filter(
            (n): n is UnparsableExpression | UnparsableType =>
                n instanceof UnparsableExpression ||
                n instanceof UnparsableType,
        );

    expect(
        unparsables,
        'Unparsable at: `' +
            node.toWordplay().substring(0, 30) +
            '...' +
            unparsables
                .map((unp) => unp.unparsables.map((t) => t.toWordplay()).join())
                .join() +
            '`',
    ).toHaveLength(0);

    // Check for conflicts, ignoring unused binds.
    const conflicts = node.getAllConflicts(context).filter(
        (conflict) =>
            !(conflict instanceof UnusedBind) &&
            !context
                .getRoot(node)
                ?.getAncestors(
                    conflict.getConflictingNode(context, Templates),
                )
                .some((n) => n instanceof Example),
    );

    expect(
        conflicts,
        conflicts
            .map((c) =>
                c
                    .getMessage(context, Templates)
                    .explanation(DefaultLocales, context)
                    .toText(),
            )
            .join(),
    ).toHaveLength(0);
}

test.each([
    // Test all of the structure definitions
    ...Object.values(basis.structureDefinitionsByName).map(
        (structure) => [structure.getNames()[0], structure] as const,
    ),
    // Test all of the functions
    ...Object.values(basis.functionsByType)
        .map((funs) => Object.values(funs))
        .flat()
        .map((fun) => [fun.getNames()[0], fun] as const),
    // Test all of the conversions
    ...Object.values(basis.conversionsByType)
        .map((funs) => Object.values(funs))
        .flat()
        .map(
            (fun) =>
                [
                    fun.input.toWordplay() + ' → ' + fun.output.toWordplay(),
                    fun,
                ] as const,
        ),
    // Test all of the shares
    ...Object.values(basis.shares)
        .map((funs) => Object.values(funs))
        .flat()
        .map((fun) => [fun.getNames()[0], fun] as const),
])('%s should have no conflicts', (_, node) => {
    checkBasisNodes(node);
});
