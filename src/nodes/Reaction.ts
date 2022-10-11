import type Conflict from "../conflicts/Conflict";
import { NotAStream } from "../conflicts/NotAStream";
import Expression from "./Expression";
import StreamType from "./StreamType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import Unparsable from "./Unparsable";
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
import UnionType, { TypeSet } from "./UnionType";
import UnknownType from "./UnknownType";
import Exception from "../runtime/Exception";

export default class Reaction extends Expression {

    readonly initial: Expression;
    readonly delta: Token;
    readonly stream: Expression | Unparsable;
    readonly next: Expression | Unparsable;

    constructor(initial: Expression, delta: Token, stream: Expression | Unparsable, next: Expression | Unparsable) {
        super();

        this.initial = initial;
        this.delta = delta;
        this.stream = stream;
        this.next = next;

    }

    computeChildren() {
        return [ this.initial, this.delta, this.stream, this.next ];
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
        const nextType = this.next instanceof Unparsable ? new UnknownType(this.next) : this.next.getTypeUnlessCycle(context);
        if(initialType.accepts(nextType, context))
            return initialType;
        else
            return new UnionType(initialType, nextType);
    }

    compile(context: Context): Step[] {

        const initialSteps = this.initial.compile(context);
        const nextSteps = this.next.compile(context);

        // and if it has not, evaluate the initial value, then create
        // the stream. If it does exist, then evaluate the next value and then
        // append the value to the stream.
        return [
            new Start(this, evaluator => {
                // Ask evaluator to remember streams that are accessed
                evaluator.startRememberingStreamAccesses();
                // Get the latest value
                const latest = evaluator.getReactionStreamLatest(this);
                if(latest) {
                    // If this reaction is bound, bind the latest value to the bind's names
                    // so we can access the previous value.
                    const bind = this.getNearestAncestor<Bind>(Bind);
                    if(bind !== undefined)
                        bind.getNames().forEach(name => evaluator.bind(name, latest))
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
            new Jump(1 + nextSteps.length, this),
            // If the streams accessed in expression have changed (and resulted in true or some non-Boolean value), 
            // compute the next value. Otherwise, let the jump push the stream value and skip the rest.
            new JumpIfStreamUnchanged(nextSteps.length + 1, this),
            // If it has been created, has the referenced stream changed?
            ...nextSteps,
            // Finish by pushing the latest stream value for this node onto the stack.
            new Finish(this),

        ];
    }

    getStartExplanations() { 
        return {
            "eng": "We start by getting the latest value of the stream."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "We end by evaluating to the new value."
        }
    }

    evaluate(evaluator: Evaluator): Value | undefined {

        // Get the value.
        const streamValue = evaluator.popValue(undefined);

        // At this point in the compiled steps above, we should have a value on the stack
        // that is either the initial value for this reaction's stream or a new value.
        if(streamValue instanceof Exception) return streamValue;

        evaluator.addToReactionStream(this, streamValue);

        // Then push the stream's latest value back onto the value stack.
        evaluator.pushValue(streamValue);

    }

    clone(original?: Node, replacement?: Node) { 
        return new Reaction(
            this.initial.cloneOrReplace([ Expression ], original, replacement), 
            this.delta.cloneOrReplace([ Token ], original, replacement), 
            this.stream.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.next.cloneOrReplace([ Expression, Unparsable ], original, replacement)
        ) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.initial instanceof Expression) this.initial.evaluateTypeSet(bind, original, current, context);
        if(this.stream instanceof Expression) this.stream.evaluateTypeSet(bind, original, current, context);
        if(this.next instanceof Expression) this.next.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions() {
        return {
            eng: "A reaction to a stream change"
        }
    }

}