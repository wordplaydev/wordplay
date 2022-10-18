import Bool from "../runtime/Bool";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import Halt from "../runtime/Halt";
import type Step from "../runtime/Step";
import type Value from "../runtime/Value";
import BooleanType from "./BooleanType";
import Expression from "./Expression";
import type Context from "./Context";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import Unparsable from "./Unparsable";
import type Bind from "./Bind";
import Name from "./Name";
import AccessName from "./AccessName";
import StructureType from "./StructureType";
import { IncompatibleType } from "../conflicts/IncompatibleType";
import { TypeSet } from "./UnionType";
import SemanticException from "../runtime/SemanticException";
import Start from "../runtime/Start";
import getPossibleExpressions from "./getPossibleExpressions";
import { getPossibleTypes } from "./getPossibleTypes";
import type Transform from "./Transform"

export default class Is extends Expression {

    readonly operator: Token;
    readonly expression: Expression | Unparsable;
    readonly type: Type | Unparsable;

    constructor(left: Expression | Unparsable, operator: Token, right: Type | Unparsable, ) {
        super();

        this.operator = operator;
        this.expression = left;
        this.type = right;
    }

    computeChildren() { return [ this.expression, this.operator, this.type ]; }
    computeType() { return new BooleanType(); }
    computeConflicts(context: Context) {

        // Is the type of the expression compatible with the specified type? If not, warn.
        if(this.type instanceof Type) {
            const type = this.expression.getTypeUnlessCycle(context);
            if(!this.type.accepts(type, context))
                return [ new IncompatibleType(this, type)];
        }

    }
    
    compile(context: Context): Step[] {
        return this.type instanceof Unparsable ? 
            [ 
                new Halt(evaluator => new SemanticException(evaluator, this.type), this) 
            ] : 
            [ 
                new Start(this),
                ...this.expression.compile(context), 
                new Finish(this) 
            ];
    }

    evaluate(evaluator: Evaluator): Value {

        const value = evaluator.popValue(undefined);

        return this.type instanceof Unparsable ? 
            new SemanticException(evaluator, this.type) : 
            new Bool(this.type.accepts(value.getType(evaluator.getContext()), evaluator.getContext()));

    }

    getStartExplanations() { 
        return {
            "eng": "Start by getting the value of the expression."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Check if this value is of this type."
        }
    }

    clone(original?: Node, replacement?: Node) { 
        return new Is(
            this.expression.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.operator.cloneOrReplace([ Token ], original, replacement),
            this.type.cloneOrReplace([ Unparsable, Type ], original, replacement)
        ) as this; 
    }

    /** 
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
    
        original;

        if(this.type instanceof Unparsable) return current;

        if(this.expression instanceof Name) {
            // If this is the bind we're looking for and this type check's type is in the set
            if(this.expression.getBind(context) === bind && current.contains(this.type, context))
                return new TypeSet([ this.type ], context);
        }

        if( this.expression instanceof AccessName && this.expression.name) {
            const subject = this.expression.getSubjectType(context);
            if(subject instanceof StructureType) {
                if(bind === subject.getDefinition(this.expression.name.getText()) && current.contains(this.type, context))
                return new TypeSet([ this.type ], context);
            }
        }

        return current;
    
    }

    getDescriptions() {
        return {
            eng: "Check if a value is a type"
        }
    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined { 

        if(child === this.expression)
            return getPossibleExpressions(this, this.expression, context);
        if(child === this.type)
            return getPossibleTypes(this.type, context);

    }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}