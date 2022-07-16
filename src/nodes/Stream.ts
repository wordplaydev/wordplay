import Conflict, { IncompatibleStreamValues, NotAStream } from "../parser/Conflict";
import Expression from "./Expression";
import type Program from "./Program";
import StreamType from "./StreamType";
import type Token from "./Token";
import type Type from "./Type";
import type Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Value from "../runtime/Value";

export default class Stream extends Expression {

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

    getConflicts(program: Program): Conflict[] { 
    
        const conflicts = [];

        // Streams have to be stream types!
        if(this.stream instanceof Expression && !(this.stream.getType(program) instanceof StreamType))
            conflicts.push(new NotAStream(this));

        // The initial and next must be compatible
        if(this.next instanceof Expression && !this.initial.getType(program).isCompatible(program, this.next.getType(program)))
            conflicts.push(new IncompatibleStreamValues(this));

        return conflicts; 
    
    
    }

    getType(program: Program): Type {
        // The type depends on the type of the initial value.
        return this.initial.getType(program);
    }

    evaluate(evaluator: Evaluator): Value | Node {
        return new Exception(ExceptionType.NOT_IMPLEMENTED);
    }

}