import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import type Is from "../nodes/Is";
import type Context from "../nodes/Context";

export class IncompatibleType extends Conflict {
    
    readonly is: Is;
    readonly givenType: Type;
    
    constructor(is: Is, givenType: Type) {
        super(false);
        this.is = is;
        this.givenType = givenType;
    }

    getConflictingNodes() {
        return { primary: [ this.is.expression ], secondary: [ this.is.type ] };
    }

    getExplanations(context: Context): Translations {
        return {
            "😀": TRANSLATE,
            eng: `This can never be a ${this.is.type.toWordplay()}, it's a ${this.givenType.getDescriptions(context).eng}`
        }
    }

}