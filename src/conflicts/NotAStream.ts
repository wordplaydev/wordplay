import type Previous from "../nodes/Previous";
import type Reaction from "../nodes/Reaction";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class NotAStream extends Conflict {

    readonly stream: Reaction | Previous;
    readonly received: Type;

    constructor(stream: Reaction | Previous, received: Type) {
        super(false);

        this.stream = stream;
        this.received = received;

    }

    getConflictingNodes() {
        return [ this.stream.stream ];
    }

    getExplanations() { 
        return {
            eng: `This has to be a stream, but it's a ${this.received.toWordplay()}`
        }
    }

}
