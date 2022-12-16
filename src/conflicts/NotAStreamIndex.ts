import type Context from "../nodes/Context";
import type Previous from "../nodes/Previous";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
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

    getExplanations(context: Context): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This has to be number, but it's a ${this.indexType.getDescriptions(context)}`
        }
    }

}
