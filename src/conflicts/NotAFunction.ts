import type Evaluate from "../nodes/Evaluate";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class NotAFunction extends Conflict {
    readonly evaluate: Evaluate;
    readonly received: Type;
    constructor(evaluate: Evaluate, received: Type) {
        super(false);
        this.evaluate = evaluate;
        this.received = received;
    }

    getConflictingNodes() {
        return { primary: [ this.evaluate.func ] };
    }

    getExplanations() { 
        return {
            eng: `This isn't a function, it's a ${this.received.toWordplay()}`
        }
    }

}
