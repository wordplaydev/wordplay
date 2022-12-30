import type StructureDefinition from "../nodes/StructureDefinition";
import type Type from "../nodes/Type";
import type Node from "../nodes/Node";
import BindConcept from "./BindConcept";
import Concept from "./Concept";
import FunctionConcept from "./FunctionConcept";
import NameType from "../nodes/NameType";
import type Context from "../nodes/Context";
import ConversionConcept from "./ConversionConcept";
import StructureDefinitionType from "../nodes/StructureDefinitionType";

export default class StructureConcept extends Concept {

    /** The type this concept represents. */
    readonly definition: StructureDefinition;
    
    /** The type of the structure definition, enabling the creation of examples with typed placeholders */
    readonly type: Type;

    /** A list of examples for creating the structure. For native types, likely literals, but for custom types, other useful examples. */
    readonly examples: Node[];

    /** A derived list of interfaces */
    readonly inter: StructureConcept[];

    /** A derived list of FunctionConcepts */
    readonly functions: FunctionConcept[];

    /** A derived list of BindConcepts for inputs */
    readonly inputs: BindConcept[];

    /** A derived list of BindConcepts for properties */
    readonly properties: BindConcept[];

    /** A derived list of ConversionConcepts */
    readonly conversions: ConversionConcept[];

    constructor(definition: StructureDefinition, type: Type | undefined, examples: Node[], context: Context) {

        super(context);

        this.definition = definition;
        this.type = type ?? NameType.make(definition);
        this.examples = examples;

        this.functions = this.definition.getFunctions().map(def => new FunctionConcept(def, context, this));
        this.conversions = this.definition.getAllConversions().map(def => new ConversionConcept(def, context, this));

        this.inputs = this.definition.inputs.map(bind => new BindConcept(bind, context));
        this.properties = this.definition.getProperties().map(bind => new BindConcept(bind, context));

        this.inter = this.definition.getInterfaces(context).map(inter => new StructureConcept(inter, NameType.make(inter), [], context));

    }

    getDocs() { return this.definition.docs; }

    getRepresentation() { return this.type; }

    getNodes(): Set<Node> {
        return new Set( [ this.type, ...this.examples ] );
    }

    getText(): Set<string> {
        return new Set();
    }

    getConcepts(): Set<Concept> {
        return new Set( [ ... this.inputs, ...this.properties, ...this.functions, ...this.conversions ] )
    }

    equals(concept: Concept) {
        return concept instanceof StructureConcept && concept.definition === this.definition;
    }

    /**
     * True if the concept represents the given type. Used to map types to concepts.
     */
    representsType(type: Type) { 
        return type instanceof StructureDefinitionType && this.definition === type.structure ||
            type instanceof NameType && type.definition && this.definition == type.definition ||
            this.type && this.type.accepts(type, this.context);
    }

}