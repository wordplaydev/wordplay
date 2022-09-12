import type ListAccess from "../nodes/ListAccess";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class NotAListIndex extends Conflict {

    readonly access: ListAccess;
    readonly indexType: Type;
    
    constructor(access: ListAccess, indexType: Type) {
        super(false);

        this.access = access;
        this.indexType = indexType;
    }

    getConflictingNodes() {
        return [ this.access.index ];
    }

    getExplanations() { 
        return {
            eng: `Lists can only be accessed with #'s. This is a ${this.indexType.toWordplay()}.`
        }
    }

}
