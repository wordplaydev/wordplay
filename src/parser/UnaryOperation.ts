import BooleanType from "./BooleanType";
import Conflict, { IncompatibleOperatorType } from "./Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";

export default class UnaryOperation extends Expression {

    readonly operator: Token;
    readonly value: Expression | Unparsable;

    constructor(operator: Token, value: Expression|Unparsable) {
        super();

        this.operator = operator;
        this.value = value;
    }

    getChildren() {
        return [ this.operator, this.value ];
    }

    getConflicts(program: Program): Conflict[] { 
    
        const conflicts = [];

        // If the type is unknown, that's bad.
        const type = this.value instanceof Expression ? this.value.getType(program) : undefined;

        // If the type doesn't match the operator, that's bad.
        if(this.value instanceof Expression && this.operator.text === "√" && !(type instanceof MeasurementType))
            conflicts.push(new IncompatibleOperatorType(this.value, this.operator, new MeasurementType()));
        else if(this.value instanceof Expression && this.operator.text === "¬" && !(type instanceof BooleanType))
            conflicts.push(new IncompatibleOperatorType(this.value, this.operator, new BooleanType()));

        return conflicts; 
    
    }

    getType(program: Program): Type {
        // The type depends on the operator and the value type.
        return  this.operator.text === "¬" ? new BooleanType() :
                this.operator.text === "√" && this.value instanceof Expression ? this.value.getType(program) : 
                new UnknownType(this);
    }
    

}