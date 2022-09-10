import type Expression from "../nodes/Expression";
import Conflict, { type ConflictExplanations } from "./Conflict";


export class IgnoredExpression extends Conflict {
    
    readonly expr: Expression;
    
    constructor(expr: Expression) {
        super(true);
        this.expr = expr;
    }

    getConflictingNodes() {
        return [ this.expr ];        
    }

    getExplanations(): ConflictExplanations { 
        return {
            eng: `I feel useless. I am useless! Someone use me!`
        }
    }

}
