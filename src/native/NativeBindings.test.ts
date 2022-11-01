import { test, expect } from "vitest";
import type Conflict from "../conflicts/Conflict";
import Source from "../models/Source";
import Context from "../nodes/Context";
import Unparsable from "../nodes/Unparsable";
import Evaluator from "../runtime/Evaluator";
import Shares from "../runtime/Shares";
import Native from "./NativeBindings";
import type Node from "../nodes/Node";
import UnusedBind from "../conflicts/UnusedBind";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";

const source = new Source("native", "");
const context = new Context(source, source.program, undefined, Native);
const shares = new Shares(new Evaluator(source));

function checkNativeNodes(nodes: Node[]) {

    const unparsables = nodes.reduce((unparsables: Unparsable[], def) => [ ... unparsables, ...(def.nodes(n => n instanceof Unparsable) as Unparsable[])], []);

    if(unparsables.length > 0)
        for(const unparsable of unparsables)
            console.log(`${unparsable.toWordplay()}`);

    expect(unparsables).toHaveLength(0);

    let conflicts = Object.values(Native.structureDefinitionsByName).reduce((conflicts: Conflict[], def) => [ ... conflicts, ...def.getAllConflicts(context) ], []);

    // Ignore unused binds
    conflicts = conflicts.filter(n => !(n instanceof UnusedBind));

    if(conflicts.length > 0)
        for(const conflict of conflicts)
            console.log(`${conflict.getConflictingNodes().primary.map(n => n.toWordplay()).join("\n")}\n\t${conflict.getExplanation("eng")}`);

    expect(conflicts).toHaveLength(0);

}

test("Verify that native structures don't have parsing errors or conflicts.", () => {

    // Check native structures
    checkNativeNodes(Object.values(Native.structureDefinitionsByName));

    // Check native functions
    for(const funs of Object.values(Native.functionsByType))
        checkNativeNodes(Object.values(funs));

    // Check native conversions
    for(const funs of Object.values(Native.conversionsByType))
        checkNativeNodes(Object.values(funs));

    // Check default definition shares.
    checkNativeNodes((Object.values(shares.defaults).filter(s => s instanceof StructureDefinitionValue) as StructureDefinitionValue[]).map(s => s.definition));

});