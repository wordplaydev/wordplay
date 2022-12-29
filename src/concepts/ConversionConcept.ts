import type Context from "../nodes/Context";
import type ConversionDefinition from "../nodes/ConversionDefinition";
import Convert from "../nodes/Convert";
import ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import type Node from "../nodes/Node";
import Concept from "./Concept";
import type StructureConcept from "./StructureConcept";

export default class ConversionConcept extends Concept {

    /** The function this concept represents. */
    readonly definition: ConversionDefinition;

    /** The structure concept on which this conversion is defined, if any */
    readonly structure: StructureConcept | undefined;

    /** A derived example */
    readonly example: Node;
    
    constructor(definition: ConversionDefinition, context: Context, structure?: StructureConcept) {

        super(context);

        this.definition = definition;
        this.structure = structure;

        this.example = Convert.make(ExpressionPlaceholder.make(this.definition.input), definition.output);

    }

    getRepresentation() { return this.example; }

    getNodes(): Set<Node> {
        return new Set([ this.example ]);
    }

    getText(): Set<string> {
        return new Set();
    }

    getConcepts(): Set<Concept> {
        return new Set();
    }

    equals(concept: Concept) {
        return concept instanceof ConversionConcept && concept.definition === this.definition;
    }

}