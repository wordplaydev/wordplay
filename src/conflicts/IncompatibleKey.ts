import type SetOrMapAccess from "../nodes/SetOrMapAccess";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class IncompatibleKey extends Conflict {
    readonly access: SetOrMapAccess;
    readonly expected: Type;
    readonly received: Type;
    
    constructor(access: SetOrMapAccess, expected: Type, received: Type) {
        super(false);
        this.access = access;
        this.expected = expected;
        this.received = received;
    }

    getConflictingNodes() {
        return { primary: [ this.access.key ], secondary: [ this.expected ] };
    }

    getExplanations() { 
        return {
            eng: `I expect keys of type ${this.expected.toWordplay()}, but this is ${this.received.toWordplay()}.`
        }
    }

}
