import { BoolDefinition, ListDefinition, MapDefinition, MeasurementDefinition, NoneDefinition, SetDefinition, TextDefinition } from "../native/NativeBindings";
import AnyType from "../nodes/AnyType";
import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanLiteral from "../nodes/BooleanLiteral";
import BooleanType from "../nodes/BooleanType";
import Changed from "../nodes/Changed";
import Conditional from "../nodes/Conditional";
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
import ConstructConcept from "./ConstructConcept";
import StructureConcept from "./StructureConcept";

export const ConstructConcepts: ConstructConcept[] = [
    new ConstructConcept(Bind.make(undefined, Names.make([ "_" ]), undefined, ExpressionPlaceholder.make())),
    new ConstructConcept(Block.make([ ExpressionPlaceholder.make() ])),
    new ConstructConcept(StructureDefinition.make(undefined, Names.make(["_"]), [], undefined, [], Block.make([ ExpressionPlaceholder.make() ]))),
    new ConstructConcept(Conditional.make(ExpressionPlaceholder.make(BooleanType.make()), ExpressionPlaceholder.make(), ExpressionPlaceholder.make())),
    new ConstructConcept(FunctionDefinition.make(undefined, Names.make(["_"]), undefined, [], ExpressionPlaceholder.make())),
    new ConstructConcept(Changed.make(ExpressionPlaceholder.make(StreamType.make(new AnyType())))),
    new ConstructConcept(Reaction.make(ExpressionPlaceholder.make(), ExpressionPlaceholder.make(StreamType.make(new AnyType())))),
    new ConstructConcept(ConversionDefinition.make(undefined, new TypePlaceholder(), new TypePlaceholder(), ExpressionPlaceholder.make())),
    new ConstructConcept(Convert.make(ExpressionPlaceholder.make(), new TypePlaceholder()))
]

export const NativeConcepts: StructureConcept[] = [
    new StructureConcept(BoolDefinition, BooleanType.make(), [ BooleanLiteral.make(true), BooleanLiteral.make(false) ]),
    new StructureConcept(TextDefinition, TextType.make(), [ TextLiteral.make(""), Template.make() ]),
    new StructureConcept(MeasurementDefinition, MeasurementType.make(), [ MeasurementLiteral.make(0), MeasurementLiteral.make("π"), MeasurementLiteral.make("∞") ]),
    new StructureConcept(ListDefinition, ListType.make(), [ ListLiteral.make([]) ]),
    new StructureConcept(SetDefinition, SetType.make(), [ SetLiteral.make([]) ]),
    new StructureConcept(MapDefinition, MapType.make(), [ MapLiteral.make([]) ]),
    new StructureConcept(NoneDefinition, NoneType.make(), [ NoneLiteral.make() ])
]

export const OutputConcepts = 
    ImplicitShares.filter((s): s is StructureDefinition => 
        s instanceof StructureDefinition).map(def => new StructureConcept(def, undefined, []));