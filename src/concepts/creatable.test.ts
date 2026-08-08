import Templates from '@concepts/Templates';
import { Purpose } from '@concepts/Purpose';
import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import { getEditsAt, PossibleNodes } from '@edit/menu/PossibleEdits';
import Append from '@edit/revision/Append';
import Assign from '@edit/revision/Assign';
import Replace from '@edit/revision/Replace';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Docs from '@nodes/Docs';
import Names from '@nodes/Names';
import Node from '@nodes/Node';
import Source from '@nodes/Source';
import Token from '@nodes/Token';
import TypeInputs from '@nodes/TypeInputs';
import TypeVariables from '@nodes/TypeVariables';
import { describe, expect, test } from 'vitest';

/**
 * Blocks mode must be able to construct any program a creator can type. These tests keep the
 * creation paths complete: every node type either has a creation path (a palette template in
 * Templates, or a menu suggestion via PossibleNodes) or is explicitly excluded here with a reason.
 * A new node type fails until it's given a path or classified.
 */

/** Node descriptors with no direct creation path, and why that's correct. */
const Excluded = new Map<string, string>([
    ['Token', 'the token base class; tokens are typed, not chosen'],
    // Deferred locale-doc markup internals (owner decision).
    ['Mention', 'locale-doc template internals, deferred'],
    ['Branch', 'locale-doc template internals, deferred'],
    ['ExternalExample', 'locale-doc template internals, deferred'],
    // Internal machinery that never appears in source.
    ['Iteration', 'internal evaluation machinery'],
    ['InternalExpression', 'internal evaluation machinery'],
    ['StreamDefinition', 'defined by the basis, not creators'],
    // Inference-only types, produced by type checking rather than written.
    ['StructureDefinitionType', 'inference-only type'],
    ['StreamDefinitionType', 'inference-only type'],
    ['StructureType', 'inference-only type'],
    ['ExceptionType', 'inference-only type'],
    ['NeverType', 'inference-only type'],
    ['UnknownType', 'inference-only type'],
    ['UnparsableType', 'error-recovery type'],
    ['VariableType', 'inference-only type'],
    ['CycleType', 'inference-only type'],
    ['UnknownVariableType', 'inference-only type'],
    ['NotAType', 'inference-only type'],
    ['NoExpressionType', 'inference-only type'],
    ['NotEnclosedType', 'inference-only type'],
    ['NotImplementedType', 'inference-only type'],
    ['UnknownNameType', 'inference-only type'],
    ['NonFunctionType', 'inference-only type'],
]);

test('every node type is creatable or excluded with a reason', () => {
    const creatable = new Set([
        ...Templates.map((template) => template.constructor.name),
        ...PossibleNodes.map((kind) => kind.name),
    ]);
    const unclassified = Object.keys(DefaultLocale.node).filter(
        (descriptor) => !creatable.has(descriptor) && !Excluded.has(descriptor),
    );
    expect(
        unclassified,
        'these node types have no creation path (add a template, a PossibleNodes entry with statics, or an exclusion with a reason)',
    ).toEqual([]);
});

describe('segmenting containers never leak as standalone concepts', () => {
    // Nodes that exist only to group their children: their affordance is child-level (append a
    // Name, a TypeVariable, a Doc), with the container created implicitly, populated.
    const containers = [Names, TypeVariables, TypeInputs, Docs];

    test('pure containers are hidden from the palette and guide', () => {
        // Docs is exempt: it has documentation-purpose guide content of its own.
        for (const container of [Names, TypeVariables, TypeInputs]) {
            const template = Templates.find((t) => t instanceof container);
            expect(
                template?.getPurpose(),
                `${container.name} must be Purpose.Hidden`,
            ).toBe(Purpose.Hidden);
        }
    });

    test('menus only offer containers as populated field assignments', () => {
        // Anchor on nodes across a program with definitions and docs; any container revision
        // must be an Assign/Append (a grammar-declared field), never a bare replacement.
        const source = new Source(
            'test',
            '¶docs¶\nƒ add⸨T⸩(a•# b•#) a + b\nadd(1 2)',
        );
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        for (const anchor of source.nodes(
            (n): n is Node => !(n instanceof Token) && n.toWordplay() !== '',
        )) {
            const caret = new Caret(source, anchor, undefined, undefined);
            for (const revision of getEditsAt(
                project,
                caret,
                undefined,
                DefaultLocales,
            )) {
                // Removing an existing container is fine; creating one is what must stay
                // field-scoped and populated.
                if (revision.isRemoval()) continue;
                const node = revision.getNewNode(DefaultLocales);
                if (
                    node === undefined ||
                    !containers.some((container) => node instanceof container)
                )
                    continue;
                // Swapping a container for another of its own kind (e.g. replacing existing
                // docs with the doc template) edits in place rather than leaking the container
                // into an expression position.
                if (
                    revision instanceof Replace &&
                    revision.node.constructor === node.constructor
                )
                    continue;
                expect(
                    revision instanceof Assign || revision instanceof Append,
                    `${node.constructor.name} offered as ${revision.constructor.name} at ${anchor.toWordplay()}`,
                ).toBe(true);
                // And never bare: the container carries at least one child to work on.
                expect(
                    node
                        .getChildren()
                        .some((child) => !(child instanceof Token)),
                    `${node.constructor.name} offered empty`,
                ).toBe(true);
            }
        }
    });
});
