import Conflict, { UnknownConversion } from "../parser/Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";
import type Token from "./Token";

export default class Convert extends Expression {
    
    readonly expression: Expression;
    readonly convert: Token;
    readonly type: Type | Unparsable;

    constructor(expression: Expression, convert: Token, type: Type | Unparsable) {
        super();

        this.expression = expression;
        this.convert = convert;
        this.type = type;
    }

    getChildren() { return [ this.expression, this.type ]; }

    getConflicts(program: Program): Conflict[] { 
        
        // The expression's type must have a conversion.
        const exprType = this.expression.getType(program);
        if(this.type instanceof Type && exprType.getConversion(program, this.type) === undefined)
            return [ new UnknownConversion(this, this.type) ];
        
        return []; 
    
    }

    getType(program: Program): Type {
        // Whatever this converts to.
        return this.type instanceof Type ? this.type : new UnknownType(this);
    }

}