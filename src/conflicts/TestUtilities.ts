import { expect } from "vitest";
import Block from "../nodes/Block";
import Expression from "../nodes/Expression";
import Context from "../nodes/Context";
import Source from "../models/Source";
import Shares from "../runtime/Shares";
import Project from "../models/Project";
import type { _ } from "$env/static/private";

export function testConflict(goodCode: string, badCode: string, nodeType: Function, conflictType: Function, nodeIndex: number = 0) {

    const goodSource = new Source("test", goodCode);
    const goodProject = new Project("good", goodSource, []);
    const goodProgram = goodSource.expression;
    const goodOp = goodProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(goodOp).toBeInstanceOf(nodeType);
    expect(goodOp?.getConflicts(new Context(goodProject, goodSource, new Shares())).filter(n => n instanceof conflictType)).toHaveLength(0);

    const badSource = new Source("test", badCode);
    const badProject = new Project("bad", badSource, []);
    const badProgram = badSource.expression;
    const badOp = badProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(badOp).toBeInstanceOf(nodeType);
    const conflicts = badOp?.getConflicts(new Context(badProject, badSource, new Shares()));
    expect(conflicts?.find(c => c instanceof conflictType)).toBeInstanceOf(conflictType);

}

/** Given some code, verify that the type of the last expression in the program's block is of the expected type. */
export function testTypes(code: string, typeExpected: Function) {

    const source = new Source("test", code);
    const project = new Project("test", source, []);
    const last = source.expression.expression instanceof Block ? source.expression.expression.getLast() : undefined;
    const lastIsExpression = last instanceof Expression;
    if(last instanceof Expression) {
        const type = last.getType(new Context(project, source, new Shares()));
        const match = type instanceof typeExpected;
        if(!match)
            console.log(`Expression's type is ${type.constructor.name}`);
        expect(match).toBe(true);
    }
    else {
        console.log(`Last expression of this code is undefined.`);
    }
    expect(lastIsExpression).toBe(true);

}