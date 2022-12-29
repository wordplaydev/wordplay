import type Context from "../nodes/Context";
import type Node from "../nodes/Node";
import Reference from "../nodes/Reference";
import StreamType from "../nodes/StreamType";
import StructureDefinitionType from "../nodes/StructureDefinitionType";
import type Stream from "../runtime/Stream";
import Concept from "./Concept";
import StructureConcept from "./StructureConcept";

export default class StreamConcept extends Concept {

    /** The type this concept represents. */
    readonly stream: Stream;
    
    /** A derived reference to the stream */
    readonly reference: Reference;

    /** A derived concept for the value type. */
    readonly type: StructureConcept | undefined;

    constructor(stream: Stream, context: Context) {

        super(context);

        this.stream = stream;
        this.reference = Reference.make(this.stream);

        const type = this.stream.getType(context);
        this.type = type instanceof StreamType && type.type instanceof StructureDefinitionType ? new StructureConcept(type.type.structure, type.type, [], context) : undefined;

    }

    getRepresentation() { return this.reference; }

    getNodes(): Set<Node> {
        return new Set([ this.reference ]);
    }

    getText(): Set<string> {
        return new Set();
    }

    getConcepts(): Set<Concept> {
        return new Set([ ... (this.type ? [ this.type ] : []) ]);
    }

}