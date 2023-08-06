import { test, expect } from 'vitest';
import Source from '@nodes/Source';
import Context from '@nodes/Context';
import type Node from '@nodes/Node';
import UnusedBind from '@conflicts/UnusedBind';
import UnparsableType from '@nodes/UnparsableType';
import UnparsableExpression from '@nodes/UnparsableExpression';
import Project from '../models/Project';
import Example from '../nodes/Example';
import { DefaultLocale } from '../db/Creator';
import { Basis } from './Basis';

const basis = Basis.getLocalizedBasis(DefaultLocale);

const source = new Source('basis', '');
const project = new Project(null, 'test', source, [], DefaultLocale);
const context = new Context(project, source);

function checkBasisNodes(nodes: Node[]) {
    // Check for syntax errors
    const unparsables = nodes.reduce(
        (unparsables: (UnparsableExpression | UnparsableType)[], def) => [
            ...unparsables,
            ...def.nodes(
                (n): n is UnparsableExpression | UnparsableType =>
                    n instanceof UnparsableExpression ||
                    n instanceof UnparsableType
            ),
        ],
        []
    );

    if (unparsables.length > 0)
        for (const unparsable of unparsables) {
            const def = nodes.find((node) => node.contains(unparsable));
            console.error(
                `Syntax error: ${unparsable.toWordplay()}n\n\n in ${def?.toWordplay()}`
            );
        }

    expect(unparsables).toHaveLength(0);

    // Check for conflicts, ignoring unused binds.
    for (const node of nodes) {
        const conflicts = node
            .getAllConflicts(context)
            .filter((n) => !(n instanceof UnusedBind));

        if (conflicts.length > 0) {
            for (const conflict of conflicts) {
                const conflictingNodes = conflict.getConflictingNodes();

                // Ignore conflicts in examples
                if (
                    !context
                        .getRoot(node)
                        ?.getAncestors(conflictingNodes.primary.node)
                        .some((n) => n instanceof Example)
                ) {
                    console.error(
                        `Conflict on:\n${node
                            .toWordplay()
                            .substring(
                                0,
                                50
                            )}\nPrimary node: ${conflictingNodes.primary.node.toWordplay()}\n\t${
                            conflict.constructor.name
                        }\n${conflictingNodes.primary.explanation(
                            basis.locales[0],
                            context
                        )}`
                    );

                    expect(conflicts).toHaveLength(0);
                }
            }
        }
    }
}

test("Verify that basis structures don't have parsing errors or conflicts.", () => {
    // Check basis structures
    checkBasisNodes(Object.values(basis.structureDefinitionsByName));

    // Check basis functions
    for (const funs of Object.values(basis.functionsByType))
        checkBasisNodes(Object.values(funs));

    // Check basis conversions
    for (const funs of Object.values(basis.conversionsByType))
        checkBasisNodes(Object.values(funs));

    // Check default definition shares.
    checkBasisNodes(project.shares.all);
});
