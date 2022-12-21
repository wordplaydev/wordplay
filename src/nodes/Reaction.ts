import type Conflict from "../conflicts/Conflict";
import Expression, { CycleType } from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Jump from "../runtime/Jump";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import Bind from "./Bind";
import type Context from "./Context";
import UnionType from "./UnionType";
import type TypeSet from "./TypeSet";
import Exception from "../runtime/Exception";
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform"
import Replace from "../transforms/Replace";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Reaction extends Expression {

    readonly initial: Expression;
    readonly delta: Token;
    readonly next: Expression;

    constructor(initial: Expression, delta: Token, next: Expression) {
        super();

        this.initial = initial;
        this.delta = delta;
        this.next = next;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "initial", types:[ Expression ] },
            { name: "delta", types:[ Token ] },
            { name: "next", types:[ Expression ] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new Reaction(
            this.replaceChild("initial", this.initial, original, replacement), 
            this.replaceChild<Token>("delta", this.delta, original, replacement),
            this.replaceChild<Expression>("next", this.next, original, replacement)
        ) as this; 
    }

    computeConflicts(_: Context): Conflict[] { 
    
        const conflicts: Conflict[] = [];
        return conflicts; 
    
    }

    computeType(context: Context): Type {
        const initialType = this.initial.getType(context);
        const nextType = this.next.getType(context);
        const type = UnionType.getPossibleUnion(context, [ initialType, nextType ]);

        // If the type includes an unknown type because of a cycle, remove the unknown, since the rest of the type defines the possible values.
        const types = type.getTypeSet(context).list();
        const cycle = types.findIndex(type => type instanceof CycleType);
        if(cycle >= 0) {
            types.splice(cycle, 1);
            return UnionType.getPossibleUnion(context, types);
        } else
            return type;

    }

    getDependencies(): Expression[] {
        return [ this.initial, this.next ];
    }

    compile(context: Context): Step[] {

        const initialSteps = this.initial.compile(context);
        const nextSteps = this.next.compile(context);

        return [
            new Start(this,
                evaluator => {

                // Get the latest value if this reaction
                const latest = evaluator.getReactionStreamLatest(this);
                if(latest) {
                    // If this reaction is bound, bind the latest value to the bind's names
                    // so we can access the previous value via those names.
                    const parent = context.get(this)?.getParent();
                    if(parent instanceof Bind)
                        evaluator.bind(parent.names, latest);
                }

                // If this reaction already has a stream, jump past the initial value expression.
                if(evaluator.hasReactionStream(this as Reaction))
                    evaluator.jump(initialSteps.length + 1);
    
                return undefined;
            }),
            // If it has not, evaluate the initial value...
            ...initialSteps,
            // ... then jump to finish to remember the stream value.
            new Jump(nextSteps.length, this),
            // Otherwise, compute the new value.
            ...nextSteps,
            // Finish by getting the final value, adding it to the reaction stream, then push it back on the stack for others to use.
            new Finish(this),

        ];
    }

    evaluate(evaluator: Evaluator, value: Value | undefined): Value {

        // Get the value.
        const streamValue = value ?? evaluator.popValue(undefined);

        // At this point in the compiled steps above, we should have a value on the stack
        // that is either the initial value for this reaction's stream or a new value.
        if(streamValue instanceof Exception) return streamValue;

        // If the stream's value is different from the latest value, add it.
        const latest = evaluator.getReactionStreamLatest(this);
        if(latest !== streamValue)
            evaluator.addToReactionStream(this, streamValue);

        // Return the value we computed.
        return streamValue;

    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.initial instanceof Expression) this.initial.evaluateTypeSet(bind, original, current, context);
        if(this.next instanceof Expression) this.next.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 

        if(child === this.initial)
            return getExpressionReplacements(this, this.initial, context);
        else if(child === this.next)
            return getExpressionReplacements(this, this.next, context);    

    }

    getInsertionBefore() { return undefined; }
 
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.initial || child === this.next) return new Replace(context, child, new ExpressionPlaceholder());
    }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.initial) return {
            "😀": TRANSLATE,
            eng: "inital"
        };
        else if(child === this.next) return {
            "😀": TRANSLATE,
            eng: "next"
        };

    }
    
    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A reaction to a stream change"
        }
    }

    getStart() { return this.delta; }
    getFinish() { return this.delta; }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "We start by getting the latest value of the stream."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "We end by evaluating to the new value."
        }
    }

}