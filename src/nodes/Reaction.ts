import type Conflict from "../conflicts/Conflict";
import { IncompatibleStreamValues } from "../conflicts/IncompatibleStreamValues";
import { NotAStream } from "../conflicts/NotAStream";
import Expression from "./Expression";
import StreamType from "./StreamType";
import type Token from "./Token";
import type Type from "./Type";
import type Unparsable from "./Unparsable";
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

export default class Reaction extends Expression {

    readonly initial: Expression;
    readonly dots: Token;
    readonly stream: Expression | Unparsable;
    readonly next: Expression | Unparsable;

    constructor(initial: Expression, dots: Token, stream: Expression | Unparsable, next: Expression | Unparsable) {
        super();

        this.initial = initial;
        this.dots = dots;
        this.stream = stream;
        this.next = next;

    }

    getChildren() {
        return [ this.initial, this.dots, this.stream, this.next ];
    }

    getConflicts(context: ConflictContext): Conflict[] { 
    
        const conflicts = [];

        // Streams have to be stream types!
        if(this.stream instanceof Expression && !(this.stream.getType(context) instanceof StreamType))
            conflicts.push(new NotAStream(this));

        // The initial and next must be compatible
        if(this.next instanceof Expression && !this.initial.getType(context).isCompatible(context, this.next.getType(context)))
            conflicts.push(new IncompatibleStreamValues(this));

        return conflicts; 
    
    }

    getType(context: ConflictContext): Type {
        const initialType = this.initial.getType(context);
        const nextType = this.next.getType(context);
        if(initialType.isCompatible(context, nextType))
            return initialType;
        else
            return new UnionType(initialType, nextType);
    }

    compile(context: ConflictContext):Step[] {

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
                        bind.names.forEach(name => evaluator.bind(name.getName(), latest));
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

}