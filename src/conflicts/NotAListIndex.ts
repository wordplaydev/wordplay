import type Context from "../nodes/Context";
import type ListAccess from "../nodes/ListAccess";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
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
        return { primary: this.access.index, secondary: [] };
    }

    getPrimaryExplanation(context: Context): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Lists can only be accessed with #'s, this is ${this.indexType.getDescriptions(context).eng}`
        }
    }

}
