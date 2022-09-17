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
import Action from "../runtime/Start";
import JumpIfStreamExists from "../runtime/JumpIfStreamExists";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Bind from "./Bind";
import type { ConflictContext } from "./Node";
import UnionType from "./UnionType";
import UnknownType from "./UnknownType";

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

    computeConflicts(context: ConflictContext): Conflict[] { 
    
        const conflicts = [];

        // Streams have to be stream types!
        const streamType = this.stream.getTypeUnlessCycle(context);
        if(this.stream instanceof Expression && !(streamType instanceof StreamType))
            conflicts.push(new NotAStream(this, streamType));

        return conflicts; 
    
    }

    computeType(context: ConflictContext): Type {
        const initialType = this.initial.getTypeUnlessCycle(context);
        const nextType = this.next instanceof Unparsable ? new UnknownType(this.next) : this.next.getTypeUnlessCycle(context);
        if(initialType.isCompatible(nextType, context))
            return initialType;
        else
            return new UnionType(initialType, nextType);
    }

    compile(context: ConflictContext): Step[] {

        const initialSteps = this.initial.compile(context);
        const nextSteps = this.next.compile(context);

        // and if it has not, evaluate the initial value, then create
        // the stream. If it does exist, then evaluate the next value and then
        // append the value to the stream.
        return [
            new Action(this, evaluator => {
                // Ask evaluator to remember streams that are accessed
                evaluator.startRememberingStreamAccesses();
                // Get the latest value
                const latest = evaluator.getReactionStreamLatest(this);
                if(latest) {
                    // If this reaction is bound, bind the latest value to the bind's names
                    // so we can access the previous value.
                    const bind = evaluator.program.getNearestAncestor<Bind>(this, Bind);
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
    
    evaluate(evaluator: Evaluator): Value | undefined {

        // Get the value.
        const streamValue = evaluator.popValue();

        // At this point in the compiled steps above, we should have a value on the stack
        // that is either the initial value for this reaction's stream or a new value.
        if(streamValue === undefined)
            return new Exception(this, ExceptionKind.EXPECTED_VALUE);
        else
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

}