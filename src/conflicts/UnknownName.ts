import type Name from "../nodes/Name";
import type Node from "../nodes/Node";
import Conflict from "./Conflict";


export class UnknownName extends Conflict {
    
    readonly name: Name;
    
    constructor(name: Name) {
        super(false);
        this.name = name;
    }

    getConflictingNodes(): Node[] {
        return [ this.name.name ]
    }

    getExplanations() { 
        return {
            eng: `I don't know who I am!`
        }
    }

}