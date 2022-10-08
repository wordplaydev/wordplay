import type Token from "../nodes/Token";
import Conflict from "./Conflict";

export class UnknownName extends Conflict {
    
    readonly name: Token;
    
    constructor(name: Token) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() {
        return { primary: [ this.name ] };
    }

    getExplanations() { 
        return {
            eng: `I don't know who I am!`
        }
    }

}