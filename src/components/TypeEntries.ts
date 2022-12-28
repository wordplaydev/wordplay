import { BoolDefinition, ListDefinition, MapDefinition, MeasurementDefinition, NoneDefinition, SetDefinition, TextDefinition } from "../native/NativeBindings";
import Bind from "../nodes/Bind";
import Evaluate from "../nodes/Evaluate";
import type Expression from "../nodes/Expression";
import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import NameType from "../nodes/NameType";
import PropertyReference from "../nodes/PropertyReference";
import Reference from "../nodes/Reference";
import StructureDefinition from "../nodes/StructureDefinition";
import type Type from "../nodes/Type";
import { parseExpression, parseType, toTokens } from "../parser/Parser";
import ImplicitShares from "../runtime/ImplicitShares";
import type Node from "../nodes/Node";

export type TypeCategory = "data" | "output" | "project";

export type TypeEntry = {
    kind: TypeCategory,
    definition: StructureDefinition, 
    creators: Expression[],
    name: Node,
    constructs: Expression[],
    functions: Evaluate[]
}

function structureToEntry(kind: TypeCategory, literals: Expression[] | undefined, def: StructureDefinition, name: Node, constructs: Expression[]): TypeEntry {
    return { 
        kind,
        definition: def,
        creators: literals ?? [ Evaluate.make(
            Reference.make(def.names.names[0].name.getText()),
            def.inputs.filter(input => input instanceof Bind && !input.hasDefault()).map(() => new ExpressionPlaceholder())
        ) ],
        name: name,
        constructs: constructs,
        // Map each function to an Evaluate with placeholders for the structure and required arguments
        functions: def.getFunctions(true).map(fun => 
            Evaluate.make(
                PropertyReference.make(new ExpressionPlaceholder(), Reference.make(fun.names.names[0].name.getText())),
                fun.inputs.filter(input => input instanceof Bind && !input.hasDefault()).map(() => new ExpressionPlaceholder())
            )
        )
    };
}

function nativeStructureToEntry(def: StructureDefinition, literals: string[], type: string, constructs: string[]): TypeEntry {
    return structureToEntry(
        "data",
        literals.map(literal => parseExpression(toTokens(literal)) as Expression),
        def, 
        parseType(toTokens(type)) as Type,
        constructs.map(construct => parseExpression(toTokens(construct)) as Expression)
    );
}

export function nonNativeStructureToEntry(kind: TypeCategory, def: StructureDefinition): TypeEntry {
    return structureToEntry(
        kind,
        undefined,
        def, 
        new NameType(def.names.names[0].name.getText()),
        []
    );
}

export let nativeTypeEntries: TypeEntry[] = [
    nativeStructureToEntry(BoolDefinition, [ "⊤", "⊥" ], "?", [ "_ ? _ _" ]),
    nativeStructureToEntry(TextDefinition, [ '""' ], '""', [ "'\\_\\'" ]),
    nativeStructureToEntry(MeasurementDefinition, [ "0", "π", "∞" ], '#', [ ]),
    nativeStructureToEntry(ListDefinition, [ '[]' ], '[]', [ "_[ _ ]" ]),
    nativeStructureToEntry(SetDefinition, [ '{}' ], '{}', [ "_{ _ }" ]),
    nativeStructureToEntry(MapDefinition, [ '{:}' ], '{:}', [ "_{ _ }" ]),
    nativeStructureToEntry(NoneDefinition, [ "!" ], "!", [ "_ ? _ _" ])
]

export let outputTypeEntries = 
    ImplicitShares.filter((s): s is StructureDefinition => 
        s instanceof StructureDefinition).map(def => nonNativeStructureToEntry("output", def));