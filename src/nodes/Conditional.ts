import BooleanType from "./BooleanType";
import type Conflict from "../conflicts/Conflict";
import { ExpectedBooleanCondition } from "../conflicts/ExpectedBooleanCondition";
import Expression from "./Expression";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import JumpIfFalse from "../runtime/JumpIfFalse";
import Jump from "../runtime/Jump";
import type { ConflictContext } from "./Node";
import UnionType from "./UnionType";

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

    computeChildren() { return [ this.condition, this.conditional, this.yes, this.no ]; }

    getConflicts(context: ConflictContext): Conflict[] {
    
        const children = [];

        if(!(this.condition.getTypeUnlessCycle(context) instanceof BooleanType))
            children.push(new ExpectedBooleanCondition(this));

        return children; 
    
    }

    computeType(context: ConflictContext): Type {
        // Whatever type the yes/no returns.
        if(this.yes instanceof Unparsable) {
            if(this.no instanceof Unparsable)
                return new UnknownType(this);
            else 
                return this.no.getTypeUnlessCycle(context);
        }
        else {
            if(this.no instanceof Unparsable)
                return this.yes.getTypeUnlessCycle(context);
            else {
                const yesType = this.yes.getTypeUnlessCycle(context);
                const noType = this.no.getTypeUnlessCycle(context);
                if(yesType.isCompatible(context, noType))
                    return yesType;
                else 
                return new UnionType(yesType, noType);
            }
        }
    }

    compile(context: ConflictContext):Step[] {

        const yes = this.yes.compile(context);
        const no = this.no.compile(context);

        // Evaluate the condition, jump past the yes if false, otherwise evaluate the yes then jump past the no.
        return [ 
            ...this.condition.compile(context), 
            new JumpIfFalse(yes.length + 1, this), 
            ...yes, 
            new Jump(no.length, this),
            ...no 
        ];
        
    }

    /** We never actually evaluate this node below because the jump logic handles things. */
    evaluate(evaluator: Evaluator) { return undefined; }

}