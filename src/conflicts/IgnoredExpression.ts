import type Expression from "../nodes/Expression";
import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";


export class IgnoredExpression extends Conflict {
    
    readonly expr: Expression;
    
    constructor(expr: Expression) {
        super(true);
        this.expr = expr;
    }

    getConflictingNodes() {
        return { primary: [ this.expr ] }
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `I feel useless. I am useless! Someone use me!`
        }
    }

}
