import BooleanType from "./BooleanType";
import type Conflict from "../conflicts/Conflict";
import { ExpectedBooleanCondition } from "../conflicts/ExpectedBooleanCondition";
import Expression from "./Expression";
import Token from "./Token";
import type Node from "./Node";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Step from "../runtime/Step";
import JumpIf from "../runtime/JumpIf";
import Jump from "../runtime/Jump";
import type Context from "./Context";
import UnionType, { TypeSet } from "./UnionType";
import type Bind from "./Bind";
import Start from "../runtime/Start";
import { BOOLEAN_TYPE_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Transform from "../transforms/Transform"
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import { endsWithName, startsWithName } from "./util";
import Replace from "../transforms/Replace";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Translations from "./Translations";

export default class Conditional extends Expression {
    
    readonly condition: Expression;
    readonly conditional: Token;
    readonly yes: Expression | Unparsable;
    readonly no: Expression | Unparsable;

    constructor(condition: Expression, yes: Expression | Unparsable, no: Expression | Unparsable, conditional?: Token) {
        super();

        this.condition = condition;
        this.conditional = conditional ?? new Token(BOOLEAN_TYPE_SYMBOL, TokenType.BOOLEAN_TYPE, " ");
        this.yes = yes;
        // Must have a preciding space if yes ends with a name and no starts with one.
        this.no = no.withPrecedingSpaceIfDesired(endsWithName(yes) && startsWithName(no));

    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Conditional(
            this.cloneOrReplaceChild(pretty, [ Expression ], "condition", this.condition, original, replacement), 
            this.cloneOrReplaceChild<Expression|Unparsable>(pretty, [ Expression, Unparsable ], "yes", this.yes, original, replacement).withPrecedingSpaceIfDesired(pretty), 
            this.cloneOrReplaceChild<Expression|Unparsable>(pretty, [ Expression, Unparsable ], "no", this.no, original, replacement).withPrecedingSpaceIfDesired(pretty),
            this.cloneOrReplaceChild<Token>(pretty, [ Token ], "conditional", this.conditional, original, replacement).withPrecedingSpaceIfDesired(pretty)
        ) as this;
    }

    computeChildren() { return [ this.condition, this.conditional, this.yes, this.no ]; }

    computeConflicts(context: Context): Conflict[] {
    
        const children = [];

        const conditionType = this.condition.getTypeUnlessCycle(context);
        if(!(conditionType instanceof BooleanType))
            children.push(new ExpectedBooleanCondition(this, conditionType));

        return children; 
    
    }

    computeType(context: Context): Type {
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
                if(yesType.accepts(noType, context))
                    return yesType;
                else 
                return new UnionType(yesType, noType);
            }
        }
    }

    compile(context: Context):Step[] {

        const yes = this.yes.compile(context);
        const no = this.no.compile(context);

        // Evaluate the condition, jump past the yes if false, otherwise evaluate the yes then jump past the no.
        return [ 
            new Start(this),
            ...this.condition.compile(context), 
            new JumpIf(yes.length + 1, false, false, this), 
            ...yes, 
            new Jump(no.length, this),
            ...no 
        ];
        
    }

    getStartExplanations() { 
        return {
            "eng": "First check if the condition is true."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "All done."
        }
    }

    /** We never actually evaluate this node below because the jump logic handles things. */
    evaluate() { return undefined; }

    /** 
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 

        // Evaluate the condition with the current types.
        const revisedTypes = this.condition.evaluateTypeSet(bind, original, current, context);

        // Evaluate the yes branch with the revised types.
        if(this.yes instanceof Expression)
            this.yes.evaluateTypeSet(bind, original, revisedTypes, context);

        // Evaluate the no branch with the complement of the revised types.
        if(this.no instanceof Expression) {
            this.no.evaluateTypeSet(bind, original, current.difference(revisedTypes, context), context);
        }

        return current;
    
    }
    
    getDescriptions() {
        return {
            eng: "Evaluate to one of two values based on a test value"
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 
        
        if(child === this.condition)
            return getExpressionReplacements(context.source, this, this.condition, context, new BooleanType());
        if(child === this.yes)
            return getExpressionReplacements(context.source, this, this.yes, context);
        if(child === this.no)
            return getExpressionReplacements(context.source, this, this.no, context);

    }

    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.condition || child === this.yes || child === this.no)
            return new Replace(context.source, this, new ExpressionPlaceholder());
    }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.condition) return {
            eng: "condition"
        };
        else if(child === this.yes) return {
            eng: "true"
        };
        else if(child === this.no) return {
            eng: "false"
        };
    }

}