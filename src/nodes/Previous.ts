import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import MeasurementType from "./MeasurementType";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
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
import Reference from "./Reference";
import TokenType from "./TokenType";
import { getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import { PREVIOUS_SYMBOL } from "../parser/Tokenizer";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Start from "../runtime/Start";

export default class Previous extends Expression {

    readonly stream: Expression;
    readonly previous: Token;
    readonly index: Expression;

    constructor(stream: Expression, previous: Token, index: Expression) {
        super();

        this.stream = stream;
        this.previous = previous;
        this.index = index;

        this.computeChildren();

    }

    static make(stream: Expression, index: Expression) {
        return new Previous(stream, new Token(PREVIOUS_SYMBOL, TokenType.PREVIOUS), index);
    }

    getGrammar() { 
        return [
            { name: "stream", types:[ Expression ] },
            { name: "previous", types:[ Token ] },
            { name: "index", types:[ Expression ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new Previous(
            this.replaceChild("stream", this.stream, original, replacement), 
            this.replaceChild("previous", this.previous, original, replacement),
            this.replaceChild("index", this.index, original, replacement)
        ) as this; 
    }

    computeConflicts(context: Context): Conflict[] { 

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
        const streamType = this.stream.getTypeUnlessCycle(context);
        return streamType instanceof StreamType ? streamType.type : new UnknownType(this);
    }

    getDependencies(): Expression[] {
        return [ this.stream, this.index ];
    }

    compile(context: Context): Step[] {
        return [ 
            new Start(this), 
            ...this.stream.compile(context), 
            new KeepStream(this), 
            ...this.index.compile(context), 
            new Finish(this) 
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        const index = evaluator.popValue(MeasurementType.make());
        if(!(index instanceof Measurement) || !index.num.isInteger()) return index;

        const stream = evaluator.popValue(StreamType.make(new AnyType()));
        if(!(stream instanceof Stream)) return new TypeException(evaluator, StreamType.make(new AnyType()), stream);

        return stream.at(this, index.toNumber());

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
                    .map(stream => new Replace<Reference>(context, child, [ name => Reference.make(name), stream ]))

        if(child === this.index)
            return getExpressionReplacements(this, this.index, context, MeasurementType.make());

    }

    getInsertionBefore() { return undefined; }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined { 
        if(child === this.stream || child === this.index) return new Replace(context, child, new ExpressionPlaceholder());
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

    getStart() { return this.previous; }
    getFinish() { return this.previous; }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Let's get the stream value at this index."
        }
    }

}