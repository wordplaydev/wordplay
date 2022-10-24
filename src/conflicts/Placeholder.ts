import type ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
import type Translations from "../nodes/Translations";
import type TypePlaceholder from "../nodes/TypePlaceholder";
import Conflict from "./Conflict";

export default class Placeholder extends Conflict {

    readonly placeholder: ExpressionPlaceholder | TypePlaceholder;

    constructor(placeholder: ExpressionPlaceholder | TypePlaceholder) {
        super(true);
        this.placeholder = placeholder;
    }

    getConflictingNodes() {
        return { primary: [ this.placeholder ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `Don't forget to replace his with some code!`
        }
    }

}
