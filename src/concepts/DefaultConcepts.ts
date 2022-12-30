import { BoolDefinition, ListDefinition, MapDefinition, MeasurementDefinition, NoneDefinition, SetDefinition, TextDefinition } from "../native/NativeBindings";
import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanLiteral from "../nodes/BooleanLiteral";
import BooleanType from "../nodes/BooleanType";
import Changed from "../nodes/Changed";
import Conditional from "../nodes/Conditional";
import type Context from "../nodes/Context";
import ConversionDefinition from "../nodes/ConversionDefinition";
import Convert from "../nodes/Convert";
import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import FunctionDefinition from "../nodes/FunctionDefinition";
import ListLiteral from "../nodes/ListLiteral";
import ListType from "../nodes/ListType";
import MapLiteral from "../nodes/MapLiteral";
import MapType from "../nodes/MapType";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import Names from "../nodes/Names";
import NoneLiteral from "../nodes/NoneLiteral";
import NoneType from "../nodes/NoneType";
import Reaction from "../nodes/Reaction";
import SetLiteral from "../nodes/SetLiteral";
import SetType from "../nodes/SetType";
import StreamType from "../nodes/StreamType";
import StructureDefinition from "../nodes/StructureDefinition";
import Template from "../nodes/Template";
import TextLiteral from "../nodes/TextLiteral";
import TextType from "../nodes/TextType";
import TypePlaceholder from "../nodes/TypePlaceholder";
import ImplicitShares from "../runtime/ImplicitShares";
import type Concept from "./Concept";
import ConstructConcept from "./ConstructConcept";
import FunctionConcept from "./FunctionConcept";
import StructureConcept from "./StructureConcept";

export function getConstructConcepts(context: Context): ConstructConcept[] {
    return [
        new ConstructConcept(Bind.make(undefined, Names.make([ "_" ]), undefined, ExpressionPlaceholder.make()), context),
        new ConstructConcept(Block.make([ ExpressionPlaceholder.make() ]), context),
        new ConstructConcept(StructureDefinition.make(undefined, Names.make(["_"]), [], undefined, [], Block.make([ ExpressionPlaceholder.make() ])), context),
        new ConstructConcept(Conditional.make(ExpressionPlaceholder.make(BooleanType.make()), ExpressionPlaceholder.make(), ExpressionPlaceholder.make()), context),
        new ConstructConcept(FunctionDefinition.make(undefined, Names.make(["_"]), undefined, [], ExpressionPlaceholder.make()), context),
        new ConstructConcept(Changed.make(ExpressionPlaceholder.make(StreamType.make(new TypePlaceholder()))), context),
        new ConstructConcept(Reaction.make(ExpressionPlaceholder.make(), ExpressionPlaceholder.make(StreamType.make(new TypePlaceholder()))), context),
        new ConstructConcept(ConversionDefinition.make(undefined, new TypePlaceholder(), new TypePlaceholder(), ExpressionPlaceholder.make()), context),
        new ConstructConcept(Convert.make(ExpressionPlaceholder.make(), new TypePlaceholder()), context)
    ]
};

export function getNativeConcepts(context: Context): StructureConcept[] {
    return [
        new StructureConcept(BoolDefinition, BooleanType.make(), [ BooleanLiteral.make(true), BooleanLiteral.make(false) ], context),
        new StructureConcept(TextDefinition, TextType.make(), [ TextLiteral.make(""), Template.make() ], context),
        new StructureConcept(MeasurementDefinition, MeasurementType.make(), [ MeasurementLiteral.make(0), MeasurementLiteral.make("π"), MeasurementLiteral.make("∞") ], context),
        new StructureConcept(ListDefinition, ListType.make(), [ ListLiteral.make([]) ], context),
        new StructureConcept(SetDefinition, SetType.make(), [ SetLiteral.make([]) ], context),
        new StructureConcept(MapDefinition, MapType.make(), [ MapLiteral.make([]) ], context),
        new StructureConcept(NoneDefinition, NoneType.make(), [ NoneLiteral.make() ], context)
    ]
}

export function getOutputConcepts(context: Context): Concept[] { 
    return ImplicitShares.map(def => def instanceof StructureDefinition ? new StructureConcept(def, undefined, [], context) : new FunctionConcept(def, context, undefined));
}