import Native from "../native/NativeBindings";
import Block from "../nodes/Block";
import Expression from "../nodes/Expression";
import Context from "../nodes/Context";
import { parse } from "../parser/Parser";

export function testConflict(goodCode: string, badCode: string, nodeType: Function, conflictType: Function, nodeIndex: number = 0) {

    const goodProgram = parse(goodCode);
    const goodOp = goodProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(goodOp).toBeInstanceOf(nodeType);
    expect(goodOp?.getConflicts(new Context(goodProgram)).filter(n => n instanceof conflictType)).toHaveLength(0);

    const badProgram = parse(badCode);
    const badOp = badProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(badOp).toBeInstanceOf(nodeType);
    expect(badOp?.getConflicts(new Context(badProgram)).find(c => c instanceof conflictType)).toBeInstanceOf(conflictType);

}

/** Given some code, verify that the type of the last expression in the program's block is of the expected type. */
export function testTypes(code: string, typeExpected: Function) {

    const program = parse(code);
    const last = program.block instanceof Block ? program.block.getLast() : undefined;
    const lastIsExpression = last instanceof Expression;
    if(last instanceof Expression) {
        const type = last.getType(new Context(program, undefined, Native))
        const match = type instanceof typeExpected;
        if(!match)
            console.log(`Expression's type is ${type.constructor.name}`);
        expect(match).toBe(true);
    }
    else {
        console.log(`Last expression of this code is a ${last?.constructor.name}`);
    }
    expect(lastIsExpression).toBe(true);

}