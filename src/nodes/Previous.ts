import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Measurement from "../runtime/Measurement";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type { ConflictContext } from "./Node";
import { NotAStream } from "../conflicts/NotAStream";
import StreamType from "./StreamType";
import { NotAStreamIndex } from "../conflicts/NotAStreamIndex";
import Stream from "../runtime/Stream";
import KeepStream from "../runtime/KeepStream";

export default class Previous extends Expression {

    readonly stream: Expression | Unparsable;
    readonly previous: Token;
    readonly index: Expression | Unparsable;

    constructor(stream: Expression | Unparsable, previous: Token, index: Expression | Unparsable) {
        super();

        this.stream = stream;
        this.previous = previous;
        this.index = index;
    }

    getChildren() {
        return [ this.stream, this.previous, this.index ];
    }

    getConflicts(context: ConflictContext): Conflict[] { 
    
        if(this.stream instanceof Unparsable || this.index instanceof Unparsable) return [];

        const streamType = this.stream.getTypeUnlessCycle(context);

        if(!(streamType instanceof StreamType))
            return [ new NotAStream(this) ];

        const indexType = this.index.getTypeUnlessCycle(context);

        if(!(indexType instanceof MeasurementType) || indexType.unit !== undefined)
            return [ new NotAStreamIndex(this) ];

        return [];
    
    }

    getType(context: ConflictContext): Type {
        // The type is the stream's type.
        const streamType = this.stream instanceof Unparsable ? new UnknownType(this.stream) : this.stream.getTypeUnlessCycle(context);
        return streamType instanceof StreamType && !(streamType.type instanceof Unparsable)? streamType.type : new UnknownType(this);
    }

    compile(context: ConflictContext):Step[] {
        return [ ...this.stream.compile(context), new KeepStream(this), ...this.index.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {

        const index = evaluator.popValue();
        const stream = evaluator.popValue();

        if(!(stream instanceof Stream)) return new Exception(this, ExceptionKind.EXPECTED_TYPE);
        else if(!(index instanceof Measurement) || !index.isInteger()) return new Exception(this, ExceptionKind.EXPECTED_TYPE);
        else return stream.at(index.toNumber());

    }

}