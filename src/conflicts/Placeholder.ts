import type ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type TypePlaceholder from "../nodes/TypePlaceholder";
import Conflict from "./Conflict";

export default class Placeholder extends Conflict {

    readonly placeholder: ExpressionPlaceholder | TypePlaceholder;

    constructor(placeholder: ExpressionPlaceholder | TypePlaceholder) {
        super(true);
        this.placeholder = placeholder;
    }

    getConflictingNodes() {
        return { primary: this.placeholder, secondary: [] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Don't forget to replace his with some code!`
        }
    }

}
