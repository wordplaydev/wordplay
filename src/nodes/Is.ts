import Bool from "../runtime/Bool";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type Value from "../runtime/Value";
import BooleanType from "./BooleanType";
import Expression from "./Expression";
import type Context from "./Context";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import type Bind from "./Bind";
import Reference from "./Reference";
import PropertyReference from "./PropertyReference";
import StructureDefinitionType from "./StructureDefinitionType";
import { IncompatibleType } from "../conflicts/IncompatibleType";
import UnionType from "./UnionType";
import TypeSet from "./TypeSet";
import Start from "../runtime/Start";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Is extends Expression {

    readonly expression: Expression;
    readonly operator: Token;
    readonly type: Type;

    constructor(left: Expression, operator: Token, right: Type, ) {
        super();

        this.operator = operator;
        this.expression = left;
        this.type = right;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "expression", types: [ Expression ] },
            { name: "operator", types: [ Token ] },
            { name: "type", types: [ Type ] },
        ]; 
    }

    clone(original?: Node, replacement?: Node) { 
        return new Is(
            this.replaceChild("expression", this.expression, original, replacement), 
            this.replaceChild("operator", this.operator, original, replacement),
            this.replaceChild("type", this.type, original, replacement)
        ) as this; 
    }

    computeType() { return new BooleanType(); }
    computeConflicts(context: Context) {

        // Is the type of the expression compatible with the specified type? If not, warn.
        const type = this.expression.getType(context);

        if((type instanceof UnionType && !type.getTypeSet(context).acceptedBy(this.type, context)) || 
            (!(type instanceof UnionType) && !this.type.accepts(type, context)))
            return [ new IncompatibleType(this, type)];

    }
    
    getDependencies(): Expression[] {
        return [ this.expression ];
    }

    compile(context: Context): Step[] {
        return [ 
            new Start(this),
            ...this.expression.compile(context), 
            new Finish(this) 
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        const value = evaluator.popValue(undefined);

        return new Bool(this, this.type.accepts(value.getType(evaluator.getCurrentContext()), evaluator.getCurrentContext()));

    }

    /** 
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeSet(bind: Bind, _: TypeSet, current: TypeSet, context: Context) { 

        if(this.expression instanceof Reference) {
            // If this is the bind we're looking for and this type check's type is in the set
            if(this.expression.resolve(context) === bind && current.acceptedBy(this.type, context))
                return new TypeSet([ this.type ], context);
        }

        if( this.expression instanceof PropertyReference && this.expression.name) {
            const subject = this.expression.getSubjectType(context);
            if(subject instanceof StructureDefinitionType) {
                if(bind === subject.getDefinition(this.expression.name.getName()) && current.acceptedBy(this.type, context))
                return new TypeSet([ this.type ], context);
            }
        }

        return current;
    
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Check if a value is a type"
        }
    }

    getStart() { return this.operator; }
    getFinish() { return this.type; }

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