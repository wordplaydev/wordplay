import type Reaction from "../nodes/Reaction";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class IncompatibleReactionTypes extends Conflict {

    readonly reaction: Reaction;
    readonly initialType: Type;
    readonly nextType: Type;

    constructor(stream: Reaction, initialType: Type, nextType: Type) {
        super(false);

        this.reaction = stream;
        this.initialType = initialType;
        this.nextType = nextType;
    }

    getConflictingNodes() {
        return [ this.reaction.initial, this.reaction.next ];
    }

    getExplanations() { 
        return {
            eng: `Reaction's initial type is ${this.initialType.toWordplay()}, but next is ${this.nextType.toWordplay()}.`
        }
    }

}
