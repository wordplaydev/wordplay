import type Conditional from "../nodes/Conditional";
import type Context from "../nodes/Context";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Conflict from "./Conflict";

export default class ExpectedBooleanCondition extends Conflict {
    
    readonly conditional: Conditional;
    readonly type: Type;

    constructor(conditional: Conditional, type: Type) {

        super(false);

        this.conditional = conditional;
        this.type = type;

    }

    getConflictingNodes() {
        return { primary: this.conditional.condition, secondary: [] };
    }

    getPrimaryExplanation(context: Context): Translations { 
        return {
            eng: `Expected boolean; this is type ${this.type.getDescriptions(context).eng}`,
            "😀": TRANSLATE
        }
    }

}