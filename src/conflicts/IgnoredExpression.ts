import type Expression from "../nodes/Expression";
import Conflict from "./Conflict";
import type Explanations from "../nodes/Explanations";


export class IgnoredExpression extends Conflict {
    
    readonly expr: Expression;
    
    constructor(expr: Expression) {
        super(true);
        this.expr = expr;
    }

    getConflictingNodes() {
        return { primary: [ this.expr ] }
    }

    getExplanations(): Explanations { 
        return {
            eng: `I feel useless. I am useless! Someone use me!`
        }
    }

}
