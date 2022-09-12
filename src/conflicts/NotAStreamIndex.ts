import type Previous from "../nodes/Previous";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class NotAStreamIndex extends Conflict {
    
    readonly previous: Previous;
    readonly indexType: Type;

    constructor(access: Previous, indexType: Type) {
        super(false);
        
        this.previous = access;
        this.indexType = indexType;
    }

    getConflictingNodes() {
        return [ this.previous.index ];
    }

    getExplanations() { 
        return {
            eng: `This has to be number, but it's a ${this.indexType.toWordplay()}`
        }
    }

}
