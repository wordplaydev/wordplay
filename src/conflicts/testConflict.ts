import { parse } from "../parser/Parser";


export function testConflict(goodCode: string, badCode: string, nodeType: Function, conflictType: Function, nodeIndex: number = 0) {

    const goodProgram = parse(goodCode);
    const goodOp = goodProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(goodOp).toBeInstanceOf(nodeType);
    expect(goodOp?.getConflicts({ program: goodProgram }).filter(n => n instanceof conflictType)).toHaveLength(0);

    const badProgram = parse(badCode);
    const badOp = badProgram.nodes().filter(n => n instanceof nodeType)[nodeIndex];
    expect(badOp).toBeInstanceOf(nodeType);
    expect(badOp?.getConflicts({ program: badProgram }).find(c => c instanceof conflictType)).toBeInstanceOf(conflictType);

}
