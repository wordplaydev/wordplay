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
import StructureDefinition from "../nodes/StructureDefinition";
import FunctionDefinition from "../nodes/FunctionDefinition";
import { SupportedLanguages } from "../nodes/LanguageCode";
import type Definition from "../nodes/Definition";
import type Names from "../nodes/Names";
import Bind from "../nodes/Bind";

const source = new Source("native", "");
const context = new Context(source, source.program, undefined, Native);
const shares = new Shares(new Evaluator(source));

function checkNativeNodes(nodes: Node[]) {

    // Check for syntax errors
    const unparsables = nodes.reduce((unparsables: Unparsable[], def) => [ ... unparsables, ...(def.nodes(n => n instanceof Unparsable) as Unparsable[])], []);

    if(unparsables.length > 0)
        for(const unparsable of unparsables)
            console.log(`${unparsable.toWordplay()}`);

    expect(unparsables).toHaveLength(0);

    // Check for conflicts
    let conflicts = Object.values(Native.structureDefinitionsByName).reduce((conflicts: Conflict[], def) => [ ... conflicts, ...def.getAllConflicts(context) ], []);

    // Ignore unused binds
    conflicts = conflicts.filter(n => !(n instanceof UnusedBind));

    if(conflicts.length > 0)
        for(const conflict of conflicts)
            console.log(`${conflict.getConflictingNodes().primary.map(n => n.toWordplay()).join("\n")}\n\t${conflict.getExplanation("eng")}`);

    expect(conflicts).toHaveLength(0);

    // Check for missing supported languages
    const definitionsWithMissingTranslations: string[] = [];
    for(const node of nodes) {
        if(node instanceof StructureDefinition || node instanceof FunctionDefinition) {
            
            for(const lang of SupportedLanguages) {
                if(!node.names.hasTranslation(lang))
                    definitionsWithMissingTranslations.push(`${node.names.toWordplay()} missing ${lang}`);
            }
            for(const lang of SupportedLanguages) {
                for(const input of node.inputs) {
                    if(input instanceof Bind && !input.names.hasTranslation(lang))
                        definitionsWithMissingTranslations.push(`${input.toWordplay()} on ${node.names.toWordplay()} missing ${lang}`);
                }
            }
        }
    }

    if(definitionsWithMissingTranslations.length > 0)
        console.log(definitionsWithMissingTranslations.join("\n"));

    expect(definitionsWithMissingTranslations).toHaveLength(0);

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
    checkNativeNodes((Object.values(shares.defaults).filter(s => s instanceof StructureDefinitionValue) as StructureDefinitionValue[])
        .filter((def1, index1, defs) => defs.find((def2, index2) => def1 === def2 && index2 > index1) === undefined)
        .map(s => s.definition)
    );

});