import type Name from "../nodes/Name";
import Conflict from "./Conflict";


export class UnexpectedTypeVariable extends Conflict {
    readonly name: Name;
    
    constructor(name: Name) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() {
        return { primary: [ this.name ] };
    }

    getExplanations() { 
        return {
            eng: `I describe kinds of values, but I'm not one. I don't now what to do!`
        }
    }

}
