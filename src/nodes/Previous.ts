import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Measurement from "../runtime/Measurement";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type Context from "./Context";
import { NotAStream } from "../conflicts/NotAStream";
import StreamType from "./StreamType";
import { NotAStreamIndex } from "../conflicts/NotAStreamIndex";
import Stream from "../runtime/Stream";
import KeepStream from "../runtime/KeepStream";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import TypeException from "../runtime/TypeException";
import AnyType from "./AnyType";
import Name from "./Name";
import TokenType from "./TokenType";
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import { PREVIOUS_SYMBOL } from "../parser/Tokenizer";

import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class Previous extends Expression {

    readonly stream: Expression | Unparsable;
    readonly previous: Token;
    readonly index: Expression | Unparsable;

    constructor(stream: Expression | Unparsable, index: Expression | Unparsable, previous?: Token) {
        super();

        this.stream = stream;
        this.previous = previous ?? new Token(PREVIOUS_SYMBOL, TokenType.PREVIOUS);
        this.index = index;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Previous(
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "stream", this.stream, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Expression, Unparsable ], "index", this.index, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "previous", this.previous, original, replacement)
        ) as this; 
    }

    computeChildren() {
        return [ this.stream, this.previous, this.index ];
    }

    computeConflicts(context: Context): Conflict[] { 
    
        if(this.stream instanceof Unparsable || this.index instanceof Unparsable) return [];

        const streamType = this.stream.getTypeUnlessCycle(context);

        if(!(streamType instanceof StreamType))
            return [ new NotAStream(this, streamType) ];

        const indexType = this.index.getTypeUnlessCycle(context);
        if(!(indexType instanceof MeasurementType) || indexType.unit !== undefined)
            return [ new NotAStreamIndex(this, indexType) ];

        return [];
    
    }

    computeType(context: Context): Type {
        // The type is the stream's type.
        const streamType = this.stream instanceof Unparsable ? new UnknownType(this.stream) : this.stream.getTypeUnlessCycle(context);
        return streamType instanceof StreamType && !(streamType.type instanceof Unparsable)? streamType.type : new UnknownType(this);
    }

    compile(context: Context): Step[] {
        return [ ...this.stream.compile(context), new KeepStream(this), ...this.index.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value {

        const index = evaluator.popValue(new MeasurementType());
        if(!(index instanceof Measurement) || !index.isInteger()) return index;

        const stream = evaluator.popValue(new StreamType(new AnyType()));
        if(!(stream instanceof Stream)) return stream;new TypeException(evaluator, new StreamType(new AnyType()), stream);

        return stream.at(index.toNumber());

    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.stream instanceof Expression) this.stream.evaluateTypeSet(bind, original, current, context);
        if(this.index instanceof Expression) this.index.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {
        
        if(child === this.stream)
            return  this.getAllDefinitions(this, context)
                    .filter((def): def is Stream => def instanceof Stream)
                    .map(stream => new Replace<Name>(context.source, child, [ name => new Name(name), stream ]))

        if(child === this.index)
            return getExpressionReplacements(context.source, this, this.index, context, new MeasurementType());

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined { 
        if(child === this.stream || child === this.index) return new Replace(context.source, child, new ExpressionPlaceholder());
    }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.stream) return {
            "😀": TRANSLATE,
            eng: "stream"
        };
        else if(child === this.index) return {
            "😀": TRANSLATE,
            eng: "index"
        };

    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A previous stream value"
        }
    }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Let's get the stream value at this index."
        }
    }

}