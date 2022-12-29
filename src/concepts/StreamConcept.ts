import type Context from "../nodes/Context";
import type Node from "../nodes/Node";
import Reference from "../nodes/Reference";
import type Stream from "../runtime/Stream";
import Concept from "./Concept";

export default class StreamConcept extends Concept {

    /** The type this concept represents. */
    readonly stream: Stream;
    
    /** A derived reference to the stream */
    readonly reference: Reference;

    constructor(stream: Stream, context: Context) {

        super(context);

        this.stream = stream;
        this.reference = Reference.make(this.stream);

    }

    getRepresentation() { return this.reference; }

    getNodes(): Set<Node> {
        return new Set();
    }

    getText(): Set<string> {
        return new Set();
    }

    getConcepts(): Set<Concept> {
        return new Set();
    }

}