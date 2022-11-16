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
import Reference from "./Reference";
import PropertyReference from "./PropertyReference";
import StructureType from "./StructureType";
import { IncompatibleType } from "../conflicts/IncompatibleType";
import UnionType, { TypeSet } from "./UnionType";
import SemanticException from "../runtime/SemanticException";
import Start from "../runtime/Start";
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import { getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import type Transform from "../transforms/Transform"
import Replace from "../transforms/Replace";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import TypePlaceholder from "./TypePlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Is extends Expression {

    readonly expression: Expression | Unparsable;
    readonly operator: Token;
    readonly type: Type | Unparsable;

    constructor(left: Expression | Unparsable, operator: Token, right: Type | Unparsable, ) {
        super();

        this.operator = operator;
        this.expression = left;
        this.type = right;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "expression", types:[ Expression, Unparsable ] },
            { name: "operator", types:[ Token ] },
            { name: "type", types:[ Type, Unparsable ] },
        ]; 
    }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Is(
            this.cloneOrReplaceChild(pretty, "expression", this.expression, original, replacement), 
            this.cloneOrReplaceChild(pretty, "operator", this.operator, original, replacement),
            this.cloneOrReplaceChild(pretty, "type", this.type, original, replacement)
        ) as this; 
    }

    computeType() { return new BooleanType(); }
    computeConflicts(context: Context) {

        // Is the type of the expression compatible with the specified type? If not, warn.
        if(this.type instanceof Type) {
            const type = this.expression.getTypeUnlessCycle(context);

            if((type instanceof UnionType && !type.getTypes(context).acceptedBy(this.type, context)) || 
                (!(type instanceof UnionType) && !this.type.accepts(type, context)))
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
            new Bool(this, this.type.accepts(value.getType(evaluator.getContext()), evaluator.getContext()));

    }

    /** 
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
    
        original;

        if(this.type instanceof Unparsable) return current;

        if(this.expression instanceof Reference) {
            // If this is the bind we're looking for and this type check's type is in the set
            if(this.expression.getDefinition(context) === bind && current.acceptedBy(this.type, context))
                return new TypeSet([ this.type ], context);
        }

        if( this.expression instanceof PropertyReference && this.expression.name) {
            const subject = this.expression.getSubjectType(context);
            if(subject instanceof StructureType) {
                if(bind === subject.getDefinition(this.expression.name.getText()) && current.acceptedBy(this.type, context))
                return new TypeSet([ this.type ], context);
            }
        }

        return current;
    
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 

        if(child === this.expression)
            return getExpressionReplacements(context.source, this, this.expression, context);
        if(child === this.type)
            return getPossibleTypeReplacements(child, context);

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.expression) return new Replace(context.source, child, new ExpressionPlaceholder());
        else if(child === this.type) return new Replace(context.source, child, new TypePlaceholder());
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Check if a value is a type"
        }
    }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "Start by getting the value of the expression."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Check if this value is of this type."
        }
    }

}