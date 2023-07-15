import { test, expect } from 'vitest';
import Source from '@nodes/Source';
import Context from '@nodes/Context';
import type Node from '@nodes/Node';
import UnusedBind from '@conflicts/UnusedBind';
import UnparsableType from '@nodes/UnparsableType';
import UnparsableExpression from '@nodes/UnparsableExpression';
import Project from '../models/Project';
import Example from '../nodes/Example';
import { getDefaultNative } from './Native';

const native = await getDefaultNative();

const source = new Source('native', '');
const project = new Project(null, 'test', source, [], native);
const context = new Context(project, source);

function checkNativeNodes(nodes: Node[]) {
    // Check for syntax errors
    const unparsables = nodes.reduce(
        (unparsables: (UnparsableExpression | UnparsableType)[], def) => [
            ...unparsables,
            ...(def.nodes(
                (n) =>
                    n instanceof UnparsableExpression ||
                    n instanceof UnparsableType
            ) as (UnparsableExpression | UnparsableType)[]),
        ],
        []
    );

    if (unparsables.length > 0)
        for (const unparsable of unparsables) {
            const def = nodes.find((node) => node.contains(unparsable));
            console.log(
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
                            native.locales[0],
                            context
                        )}`
                    );

                    expect(conflicts).toHaveLength(0);
                }
            }
        }
    }
}

test("Verify that native structures don't have parsing errors or conflicts.", () => {
    // Check native structures
    checkNativeNodes(Object.values(native.structureDefinitionsByName));

    // Check native functions
    for (const funs of Object.values(native.functionsByType))
        checkNativeNodes(Object.values(funs));

    // Check native conversions
    for (const funs of Object.values(native.conversionsByType))
        checkNativeNodes(Object.values(funs));

    // Check default definition shares.
    checkNativeNodes(project.shares.all);
});
