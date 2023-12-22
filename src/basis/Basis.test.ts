import { test, expect } from 'vitest';
import Source from '@nodes/Source';
import Context from '@nodes/Context';
import type Node from '@nodes/Node';
import UnusedBind from '@conflicts/UnusedBind';
import UnparsableType from '@nodes/UnparsableType';
import UnparsableExpression from '@nodes/UnparsableExpression';
import Project from '../models/Project';
import Example from '../nodes/Example';
import { Basis } from './Basis';
import DefaultLocale, { DefaultLocales } from '../locale/DefaultLocale';

const basis = Basis.getLocalizedBasis(DefaultLocales);

const source = new Source('basis', '');
const project = Project.make(null, 'test', source, [], DefaultLocale);
const context = new Context(project, source);

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
        unparsables.map((unp) => unp.toWordplay()).join(),
    ).toHaveLength(0);

    // Check for conflicts, ignoring unused binds.
    const conflicts = node.getAllConflicts(context).filter(
        (conflict) =>
            !(conflict instanceof UnusedBind) &&
            !context
                .getRoot(node)
                ?.getAncestors(conflict.getConflictingNodes().primary.node)
                .some((n) => n instanceof Example),
    );

    expect(
        conflicts,
        conflicts
            .map((c) =>
                c
                    .getConflictingNodes()
                    .primary.explanation(DefaultLocales, context)
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
