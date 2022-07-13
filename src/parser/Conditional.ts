import BooleanType from "./BooleanType";
import Conflict, { ExpectedBooleanCondition, ExpectedMatchingConditionalTypes } from "./Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";

export default class Conditional extends Expression {
    
    readonly condition: Expression;
    readonly conditional: Token;
    readonly yes: Expression | Unparsable;
    readonly no: Expression | Unparsable;

    constructor(condition: Expression, conditional: Token, yes: Expression | Unparsable, no: Expression | Unparsable) {
        super();

        this.condition = condition;
        this.conditional = conditional;
        this.yes = yes;
        this.no = no;

    }

    getChildren() { return [ this.condition, this.conditional, this.yes, this.no ]; }

    getConflicts(program: Program): Conflict[] {
    
        const children = [];

        if(!(this.condition.getType(program) instanceof BooleanType))
            children.push(new ExpectedBooleanCondition(this));

        if(this.yes instanceof Expression && this.no instanceof Expression && !(this.yes.getType(program).isCompatible(program, this.no.getType(program))))
            children.push(new ExpectedMatchingConditionalTypes(this))

        return children; 
    
    }

    getType(program: Program): Type {
        // Whatever tyoe the yes/no returns.
        return this.yes instanceof Unparsable ? new UnknownType(this) : this.yes.getType(program);
    }

}