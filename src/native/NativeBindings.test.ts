import { test, expect } from "vitest";
import type Conflict from "../conflicts/Conflict";
import Source from "../models/Source";
import Context from "../nodes/Context";
import DefaultShares from "../runtime/DefaultShares";
import Native from "./NativeBindings";
import type Node from "../nodes/Node";
import UnusedBind from "../conflicts/UnusedBind";
import StructureDefinition from "../nodes/StructureDefinition";
import FunctionDefinition from "../nodes/FunctionDefinition";
import { SupportedLanguages } from "../nodes/LanguageCode";
import Bind from "../nodes/Bind";
import UnparsableType from "../nodes/UnparsableType";
import UnparsableExpression from "../nodes/UnparsableExpression";
import Project from "../models/Project";

const source = new Source("native", "");
const project = new Project("test", source, []);
const context = new Context(project, source);

function checkNativeNodes(nodes: Node[]) {

    // Check for syntax errors
    const unparsables = nodes.reduce((unparsables: (UnparsableExpression|UnparsableType)[], def) => [ ... unparsables, ...(def.nodes(n => n instanceof UnparsableExpression || n instanceof UnparsableType) as (UnparsableExpression|UnparsableType)[])], []);

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
    checkNativeNodes(DefaultShares);

});