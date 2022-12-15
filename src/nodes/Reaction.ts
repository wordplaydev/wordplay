import type Conflict from "../conflicts/Conflict";
import { NotAStream } from "../conflicts/NotAStream";
import Expression from "./Expression";
import StreamType from "./StreamType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Jump from "../runtime/Jump";
import Finish from "../runtime/Finish";
import JumpIfStreamUnchanged from "../runtime/JumpIfStreamUnchanged";
import Start from "../runtime/Start";
import JumpIfStreamExists from "../runtime/JumpIfStreamExists";
import Bind from "./Bind";
import type Context from "./Context";
import UnionType from "./UnionType";
import type TypeSet from "./TypeSet";
import Exception from "../runtime/Exception";
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import Stream from "../runtime/Stream";
import Reference from "./Reference";
import TokenType from "./TokenType";
import { REACTION_SYMBOL } from "../parser/Tokenizer";
import type Transform from "../transforms/Transform"
import Replace from "../transforms/Replace";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import UnknownType from "./UnknownType";

export default class Reaction extends Expression {

    readonly initial: Expression;
    readonly delta: Token;
    readonly stream: Expression;
    readonly next: Expression;

    constructor(initial: Expression, stream: Expression, next: Expression, delta?: Token) {
        super();

        this.initial = initial;
        this.delta = delta ?? new Token(REACTION_SYMBOL, TokenType.REACTION);
        this.stream = stream;
        this.next = next;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "initial", types:[ Expression ] },
            { name: "delta", types:[ Token ] },
            { name: "stream", types:[ Expression ] },
            { name: "next", types:[ Expression ] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new Reaction(
            this.replaceChild("initial", this.initial, original, replacement), 
            this.replaceChild<Expression>("stream", this.stream, original, replacement),
            this.replaceChild<Expression>("next", this.next, original, replacement),
            this.replaceChild<Token>("delta", this.delta, original, replacement)
        ) as this; 
    }

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts = [];

        // Streams have to be stream types!
        const streamType = this.stream.getTypeUnlessCycle(context);
        if(this.stream instanceof Expression && !(streamType instanceof StreamType))
            conflicts.push(new NotAStream(this, streamType));

        return conflicts; 
    
    }

    computeType(context: Context): Type {
        const initialType = this.initial.getTypeUnlessCycle(context);
        const nextType = this.next.getTypeUnlessCycle(context);
        const type = UnionType.getPossibleUnion(context, [ initialType, nextType ]);

        // If the type includes an unknown type because of a cycle, remove the unknown, since the rest of the type defines the possible values.
        const types = type.getTypeSet(context).list();
        const cycle = types.findIndex(type => type instanceof UnknownType && "cycle" in type.reason);
        if(cycle >= 0) {
            types.splice(cycle, 1);
            return UnionType.getPossibleUnion(context, types);
        } else
            return type;

    }

    getDependencies(): Expression[] {
        return [ this.initial, this.stream, this.next ];
    }

    compile(context: Context): Step[] {

        const initialSteps = this.initial.compile(context);
        const nextSteps = this.next.compile(context);

        return [
            new Start(this,
                evaluator => {
                // Ask evaluator to remember streams that are accessed
                evaluator.startRememberingStreamAccesses(this);
                // Get the latest value
                const latest = evaluator.getReactionStreamLatest(this);
                if(latest) {
                    // If this reaction is bound, bind the latest value to the bind's names
                    // so we can access the previous value via those names.
                    const bind = context.get(this)?.getNearestAncestor<Bind>(Bind);
                    if(bind !== undefined)
                        evaluator.bind(bind.names, latest);
                }
                return undefined;
            }),
            // Evaluate the stream expression
            ...this.stream.compile(context),
            // Does this stream exist for this node? If so, jump to the check of whether to update it.
            // Otherwise, initialize it.
            new JumpIfStreamExists(initialSteps.length + 1, this),
            // If it has not, evaluate the initial value then jump to finish...
            ...initialSteps,
            // ... then jump to finish.
            new Jump(nextSteps.length + 1, this),
            // If the streams accessed in expression have changed (and resulted in true or some non-Boolean value), 
            // compute the next value. Otherwise, let the jump push the stream value and skip the rest.
            new JumpIfStreamUnchanged(nextSteps.length, this),
            // If it has been created, has the referenced stream changed?
            ...nextSteps,
            // Finish by pushing the latest stream value for this node onto the stack.
            new Finish(this),

        ];
    }

    evaluate(evaluator: Evaluator, value: Value | undefined): Value | undefined {

        // Get the value.
        const streamValue = value ?? evaluator.peekValue();

        // At this point in the compiled steps above, we should have a value on the stack
        // that is either the initial value for this reaction's stream or a new value.
        if(streamValue instanceof Exception) return streamValue;

        evaluator.addToReactionStream(this, streamValue);

        // Return the value we computed.
        return streamValue;

    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.initial instanceof Expression) this.initial.evaluateTypeSet(bind, original, current, context);
        if(this.stream instanceof Expression) this.stream.evaluateTypeSet(bind, original, current, context);
        if(this.next instanceof Expression) this.next.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 

        if(child === this.initial)
            return getExpressionReplacements(this, this.initial, context);
        else if(child === this.next)
            return getExpressionReplacements(this, this.next, context);    
        else if(child === this.stream)
            return  this.getAllDefinitions(this, context)
                    .filter((def): def is Stream => def instanceof Stream)
                    .map(stream => new Replace<Reference>(context, child, [ name => Reference.make(name), stream ]));

    }

    getInsertionBefore() { return undefined; }
 
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.initial || child === this.stream || child === this.next) return new Replace(context, child, new ExpressionPlaceholder());
    }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.initial) return {
            "😀": TRANSLATE,
            eng: "inital"
        };
        else if(child === this.stream) return {
            "😀": TRANSLATE,
            eng: "stream"
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