import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import {
    InsertionPoint,
    dropNodeOnSource,
    isDropPermitted,
    isValidDropTarget,
} from '@edit/drag/Drag';
import { getEditsAt } from '@edit/menu/PossibleEdits';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Node, { ListOf } from '@nodes/Node';
import Row from '@nodes/Row';
import Source from '@nodes/Source';
import Token from '@nodes/Token';
import UnparsableExpression from '@nodes/UnparsableExpression';
import UnparsableType from '@nodes/UnparsableType';
import parseExpression from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';
import { describe, expect, test } from 'vitest';

/**
 * The blocks-mode soundness invariant: no permitted edit — a drop or an applied menu revision —
 * may produce a structurally invalid program. We check it as a round-trip property: the edited
 * source's printed code must reparse without any unparsable nodes and yield the same tree.
 */

/** Programs covering the constructs blocks-mode edits can touch. */
const Corpus = [
    'a: 1\nb: 2\na + b',
    "Phrase('hi' rest: 1)",
    '[1 [2 3]] {4 5} {6:7}',
    'ƒ add⸨T⸩(a•# b•#) a + b\nadd(1 2)',
    '↑ shared/en: 1',
    '↓ sup\n1',
    '•Cat(name•"")\nCat("boomy")',
    '⎡a•# b•#⎦⎡1 2⎦',
    '¶a *b* /c/ <d@https://e>¶1',
    "pick: ⊤…∆Button()…⊥\npick ? 'a' 'b'",
    "⣿'a'⣿ ≈ 'a'",
    '1 → ""',
    "a•[# '']: [1 'hi']\na[2]",
];

/** Palette-style rootless nodes to drop, spanning literals, calls, and rows. */
const PaletteDrops = () => [
    parseExpression(toTokens('1')),
    parseExpression(toTokens('"hi"')),
    parseExpression(toTokens('_')),
    parseExpression(toTokens('Phrase(_)')),
    Row.make(),
];

/** Assert the source's printed code reparses cleanly to a structurally identical tree. */
function expectRoundTrip(source: Source, what: string) {
    const printed = source.getCode().toString();
    const reparsed = new Source('test', printed);
    const unparsables = reparsed.nodes(
        (n) => n instanceof UnparsableExpression || n instanceof UnparsableType,
    );
    expect(
        unparsables.length,
        `${what} produced unparsable code: ${JSON.stringify(printed)}`,
    ).toBe(0);
    expect(
        reparsed.expression.isStructurallyEqualTo(source.expression),
        `${what} did not round-trip: ${JSON.stringify(printed)}`,
    ).toBe(true);
}

/** All model-level drop targets in a source: nodes, plus start/end insertion points of list fields. */
function getTargets(source: Source): (Node | InsertionPoint)[] {
    const targets: (Node | InsertionPoint)[] = [...source.nodes()];
    for (const node of source.nodes()) {
        for (const field of node.getGrammar()) {
            const value = node.getField(field.name);
            if (field.kind instanceof ListOf && Array.isArray(value)) {
                const list = value.filter((item) => item instanceof Node);
                targets.push(
                    new InsertionPoint(
                        node,
                        field.name,
                        list,
                        undefined,
                        undefined,
                        0,
                    ),
                    new InsertionPoint(
                        node,
                        field.name,
                        list,
                        undefined,
                        undefined,
                        list.length,
                    ),
                );
            }
        }
    }
    return targets;
}

describe('every permitted drop round-trips', () => {
    test.each(Corpus.map((code) => [code]))(
        '%s',
        (code) => {
            const source = new Source('test', code);
            const project = Project.make(
                null,
                'test',
                source,
                [],
                DefaultLocale,
            );
            // Zero-width nodes (an empty Unit, an empty Docs) have no extent to press on, so
            // they can't be picked up in the editor; only visible nodes drag here.
            const draggables = [
                ...source.nodes(
                    (n): n is Node =>
                        !(n instanceof Token) && n.toWordplay() !== '',
                ),
                ...PaletteDrops(),
            ];
            const targets = getTargets(source);
            let simulated = 0;
            for (const dragged of draggables) {
                for (const target of targets) {
                    if (dragged === target) continue;
                    // Mirror the pointer path's structural pre-checks.
                    if (
                        target instanceof Node &&
                        !isValidDropTarget(project, dragged, target)
                    )
                        continue;
                    if (
                        target instanceof InsertionPoint &&
                        dragged.contains(target.node)
                    )
                        continue;
                    if (!isDropPermitted(project, source, dragged, target))
                        continue;
                    simulated++;
                    const [, newSource] = dropNodeOnSource(
                        project,
                        source,
                        dragged,
                        target,
                    );
                    expectRoundTrip(
                        newSource,
                        `dropping ${dragged.toWordplay()} on ${
                            target instanceof Node
                                ? target.toWordplay()
                                : `${target.field}[${target.index}]`
                        }`,
                    );
                }
            }
            // The property is vacuous if nothing was permitted; every program allows some drops.
            expect(simulated).toBeGreaterThan(0);
        },
        60000,
    );
});

describe('every menu revision surviving the blocks filter round-trips', () => {
    test.each(Corpus.map((code) => [code]))(
        '%s',
        (code) => {
            const source = new Source('test', code);
            const project = Project.make(
                null,
                'test',
                source,
                [],
                DefaultLocale,
            );
            let applied = 0;
            // Zero-width nodes (an empty Docs, an absent list) can't be selected in the editor —
            // their affordance is a field-position menu — so only visible nodes anchor here.
            for (const anchor of source.nodes(
                (n): n is Node =>
                    !(n instanceof Token) && n.toWordplay() !== '',
            )) {
                const caret = new Caret(source, anchor, undefined, undefined);
                for (const revision of getEditsAt(
                    project,
                    caret,
                    undefined,
                    DefaultLocales,
                )) {
                    const edit = revision.getEdit(DefaultLocales);
                    const newSource =
                        Array.isArray(edit) && edit[0] instanceof Source
                            ? edit[0]
                            : undefined;
                    if (newSource === undefined) continue;
                    // The blocks-mode gate: skip revisions that introduce blocking conflicts,
                    // as the editor's menu filter does.
                    if (project.getNewConflicts(source, newSource).length > 0)
                        continue;
                    applied++;
                    expectRoundTrip(
                        newSource,
                        `menu ${revision.constructor.name} of ${revision
                            .getNewNode(DefaultLocales)
                            ?.toWordplay()} at ${anchor.constructor.name} ${anchor.toWordplay()}`,
                    );
                }
            }
            expect(applied).toBeGreaterThan(0);
        },
        60000,
    );
});
