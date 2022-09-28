import Native from "../native/NativeBindings";
import Block from "../nodes/Block";
import Expression from "../nodes/Expression";
import Context from "../nodes/Context";
import Source from "../models/Source";

export function testConflict(goodCode: string, badCode: string, nodeType: Function, conflictType: Function, nodeIndex: number = 0) {

    const goodSource = new Source("test", goodCode);
    const goodProgram = goodSource.program;
    const goodOp = goodProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(goodOp).toBeInstanceOf(nodeType);
    expect(goodOp?.getConflicts(new Context(goodSource, goodProgram)).filter(n => n instanceof conflictType)).toHaveLength(0);

    const badSource = new Source("test", badCode);
    const badProgram = badSource.program;
    const badOp = badProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(badOp).toBeInstanceOf(nodeType);
    expect(badOp?.getConflicts(new Context(goodSource, badProgram)).find(c => c instanceof conflictType)).toBeInstanceOf(conflictType);

}

/** Given some code, verify that the type of the last expression in the program's block is of the expected type. */
export function testTypes(code: string, typeExpected: Function) {

    const source = new Source("test", code);
    const last = source.program.block instanceof Block ? source.program.block.getLast() : undefined;
    const lastIsExpression = last instanceof Expression;
    if(last instanceof Expression) {
        const type = last.getType(new Context(source, source.program, undefined, Native))
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