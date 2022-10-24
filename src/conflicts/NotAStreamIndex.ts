import type Previous from "../nodes/Previous";
import type Translations from "../nodes/Translations";
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
        return { primary: [ this.previous.index ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `This has to be number, but it's a ${this.indexType.toWordplay()}`
        }
    }

}
