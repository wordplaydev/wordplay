import { expect } from 'vitest';
import Block from '@nodes/Block';
import Expression from '@nodes/Expression';
import Context from '@nodes/Context';
import Source from '@nodes/Source';
import Project from '../models/Project';
import type Node from '../nodes/Node';
import type Conflict from './Conflict';
import type Type from '../nodes/Type';
import DefaultLocale from '../locale/DefaultLocale';

export function testConflict(
    goodCode: string,
    badCode: string,
    nodeType: new (...params: never[]) => Node,
    conflictType: new (...params: never[]) => Conflict,
    nodeIndex = 0
) {
    const goodSource = new Source('test', goodCode);
    const goodProject = Project.make(
        null,
        'good',
        goodSource,
        [],
        DefaultLocale
    );
    const goodProgram = goodSource.expression;
    const goodOp = goodProgram.nodes().filter((n) => n instanceof nodeType)[
        nodeIndex
    ];
    expect(goodOp).toBeInstanceOf(nodeType);
    expect(
        goodOp
            ?.getConflicts(new Context(goodProject, goodSource))
            .filter((n) => n instanceof conflictType)[0]
    ).toBeUndefined();

    const badSource = new Source('test', badCode);
    const badProject = Project.make(null, 'bad', badSource, [], DefaultLocale);
    const badProgram = badSource.expression;
    const badOp = badProgram.nodes().filter((n) => n instanceof nodeType)[
        nodeIndex
    ];
    expect(badOp).toBeInstanceOf(nodeType);
    const conflicts = badOp?.getConflicts(new Context(badProject, badSource));
    expect(conflicts?.find((c) => c instanceof conflictType)).toBeInstanceOf(
        conflictType
    );
}

/** Given some code, verify that the type of the last expression in the program's block is of the expected type. */
export function testTypes(
    code: string,
    typeExpected: new (...params: never[]) => Type
) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const last =
        source.expression.expression instanceof Block
            ? source.expression.expression.getLast()
            : undefined;
    const lastIsExpression = last instanceof Expression;
    if (last instanceof Expression) {
        const type = last.getType(new Context(project, source));
        const match = type instanceof typeExpected;
        if (!match)
            console.log(`Type of expression ${last.toWordplay()} is ${type}`);
        expect(match).toBe(true);
    } else {
        console.log(`Last expression of this code is undefined.`);
    }
    expect(lastIsExpression).toBe(true);
}
