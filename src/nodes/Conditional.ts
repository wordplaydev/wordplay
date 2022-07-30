import BooleanType from "./BooleanType";
import Conflict, { ExpectedBooleanCondition, IncompatibleConditionalBranches } from "../parser/Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import JumpIfFalse from "../runtime/JumpIfFalse";
import Jump from "../runtime/Jump";
import type { ConflictContext } from "./Node";

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

    getConflicts(context: ConflictContext): Conflict[] {
    
        const children = [];

        if(!(this.condition.getType(context) instanceof BooleanType))
            children.push(new ExpectedBooleanCondition(this));

        if(this.yes instanceof Expression && this.no instanceof Expression && !(this.yes.getType(context).isCompatible(context, this.no.getType(context))))
            children.push(new IncompatibleConditionalBranches(this))

        return children; 
    
    }

    getType(context: ConflictContext): Type {
        // Whatever tyoe the yes/no returns.
        return this.yes instanceof Unparsable ? new UnknownType(this) : this.yes.getType(context);
    }

    compile(): Step[] {

        const yes = this.yes.compile();
        const no = this.no.compile();

        // Evaluate the condition, jump past the yes if false, otherwise evaluate the yes then jump past the no.
        return [ 
            ...this.condition.compile(), 
            new JumpIfFalse(yes.length + 1, this), 
            ...yes, 
            new Jump(no.length + 1, this), 
            ...no 
        ];
        
    }

    /** We never actually evaluate this node below because the jump logic handles things. */
    evaluate(evaluator: Evaluator) { return undefined; }

}