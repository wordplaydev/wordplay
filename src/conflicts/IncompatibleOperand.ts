import type Expression from "../nodes/Expression";
import type Token from "../nodes/Token";
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class IncompatibleOperand extends Conflict {
    readonly expr: Expression;
    readonly operator: Token;
    readonly operand: Expression;
    readonly receivedType: Type;
    readonly expectedType: Type;
    
    constructor(expr: Expression, operator: Token, operand: Expression, receivedType: Type, expectedType: Type) {
        super(false);

        this.expr = expr;
        this.operator = operator;
        this.operand = operand;
        this.receivedType = receivedType;
        this.expectedType = expectedType;
    }

    getConflictingNodes() {
        return { primary: [ this.operand ], secondary: [ this.expectedType ] };
    }

    getExplanations() { 
        return {
            eng: `${this.operator.toWordplay()} expected a ${this.expectedType.toWordplay()}, but this is a ${this.receivedType?.toWordplay()}`
        }
    }

}
