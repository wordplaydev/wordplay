import type Conflict from '@conflicts/Conflict';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Block from '@nodes/Block';
import Expression from '@nodes/Expression';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import type Type from '@nodes/Type';
import { expect } from 'vitest';

/**
 * Assert that `goodCode` is free of `conflictType` and `badCode` has it, on the
 * `nodeIndex`th node of type `nodeType`.
 *
 * Every case is checked twice, because there are two ways to ask a program for
 * its conflicts and they have disagreed. Asking a node directly is the cheap
 * path the editor uses to validate a candidate edit; `Project.analyze()` is what
 * fills the annotations, underlines, and error count a creator actually sees.
 * The second is what matters and was the one nothing tested: analysis builds the
 * call graph and the dependency graph as it goes, so a conflict computed during
 * it can see project state that a bare `computeConflicts` never does, and vice
 * versa. A conflict that reproduces on only one path is a defect on the other.
 * See #808.
 */
export function testConflict(
    goodCode: string,
    badCode: string,
    nodeType: new (...params: never[]) => Node,
    conflictType: new (...params: never[]) => Conflict,
    nodeIndex = 0,
    badNodeIndex: number | undefined = undefined,
    /** True for a conflict only a completed analysis can decide, so asking the
     * node directly correctly declines to report it. `ExpectedStream` is the
     * case: whether a reaction has anything to react to depends on the calls
     * to the function its condition reads from, which only the call graph
     * knows. */
    requiresAnalysis = false,
) {
    const goodSource = new Source('test', goodCode);
    const goodProject = Project.make(
        null,
        'good',
        goodSource,
        [],
        DefaultLocale,
    );
    const goodProgram = goodSource.expression;
    const goodOp = goodProgram.nodes().filter((n) => n instanceof nodeType)[
        nodeIndex
    ];
    expect(goodOp).toBeInstanceOf(nodeType);
    expect(
        goodOp
            ?.getConflicts(goodProject.getContext(goodSource))
            .filter((n) => n instanceof conflictType)[0],
    ).toBeUndefined();

    const badSource = new Source('test', badCode);
    const badProject = Project.make(null, 'bad', badSource, [], DefaultLocale);
    const badProgram = badSource.expression;
    const badOp = badProgram.nodes().filter((n) => n instanceof nodeType)[
        badNodeIndex ?? nodeIndex
    ];
    expect(badOp).toBeInstanceOf(nodeType);
    if (!requiresAnalysis) {
        const conflicts = badOp?.getConflicts(badProject.getContext(badSource));
        expect(
            conflicts?.find((c) => c instanceof conflictType),
        ).toBeInstanceOf(conflictType);
    }

    // Now the same claims about what analysis reports, since that is what
    // reaches the creator. Counted across the whole project rather than the
    // node, because a conflict is attributed to whichever node best explains it
    // — often a child of the node that raised it — and that attribution is not
    // what these cases are about.
    const conflictsOf = (project: Project) =>
        project.analyze().conflicts.filter((c) => c instanceof conflictType);

    // The good program may legitimately have this kind of conflict somewhere
    // else (`•Math(a b) (z: a + b)` has untyped inputs, so `+` is an unknown
    // name), so demanding none of them project-wide would be wrong. What must
    // hold is that analysis doesn't *invent* one: it reports no more than a
    // plain traversal does.
    expect(conflictsOf(goodProject).length).toBeLessThanOrEqual(
        countColdConflicts(goodSource, goodProject, conflictType),
    );

    // And the bad program's conflict has to survive to the end. Losing it here
    // while the cold check above passes means analysis dropped or suppressed a
    // conflict a creator should have seen.
    expect(conflictsOf(badProject).length).toBeGreaterThan(0);
}

/** How many `conflictType` a bare traversal finds, with no analysis involved. */
function countColdConflicts(
    source: Source,
    project: Project,
    conflictType: new (...params: never[]) => Conflict,
): number {
    return source.expression
        .getAllConflicts(project.getContext(source))
        .filter((c) => c instanceof conflictType).length;
}

/** The conflicts in a program, by class name. */
export function conflictsIn(code: string): string[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return source.expression
        .getAllConflicts(project.getContext(source))
        .map((conflict) => conflict.constructor.name);
}

/** Given some code, verify that the type of the last expression in the program's block is of the expected type. */
export function testTypes(
    code: string,
    typeExpected: new (...params: never[]) => Type,
) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const last =
        source.expression.expression instanceof Block
            ? source.expression.expression.getLast()
            : undefined;
    const lastIsExpression = last instanceof Expression;
    if (last instanceof Expression) {
        const type = last.getType(project.getContext(source));
        const match = type instanceof typeExpected;
        if (!match)
            console.log(`Type of expression ${last.toWordplay()} is ${type}`);
        expect(match).toBe(true);
    } else {
        console.log(`Last expression of this code is undefined.`);
    }
    expect(lastIsExpression).toBe(true);
}
