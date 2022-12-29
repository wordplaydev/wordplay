import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import type Context from "./Context";
import { NotAStream } from "../conflicts/NotAStream";
import StreamType from "./StreamType";
import Stream from "../runtime/Stream";
import KeepStream from "../runtime/KeepStream";
import type Bind from "./Bind";
import type TypeSet from "./TypeSet";
import TypeException from "../runtime/TypeException";
import AnyType from "./AnyType";
import TokenType from "./TokenType";
import { CHANGE_SYMBOL } from "../parser/Tokenizer";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Start from "../runtime/Start";
import UnionType from "./UnionType";
import NoneType from "./NoneType";
import Bool from "../runtime/Bool";
import { NotAStreamType } from "./Previous";

export default class Changed extends Expression {

    readonly change: Token;
    readonly stream: Expression;

    constructor(change: Token, stream: Expression) {
        super();

        this.change = change;
        this.stream = stream;

        this.computeChildren();

    }

    static make(stream: Expression) {
        return new Changed(new Token(CHANGE_SYMBOL, TokenType.CHANGE), stream);
    }

    getGrammar() { 
        return [
            { name: "change", types: [ Token ] },
            { 
                name: "stream", types: [ Expression ], space: true,
                // Must be a stream with any type
                getType: () => StreamType.make(new AnyType())
            }
        ];
    }

    clone(original?: Node, replacement?: Node) { 
        return new Changed(
            this.replaceChild("change", this.change, original, replacement),
            this.replaceChild("stream", this.stream, original, replacement)
        ) as this; 
    }

    computeConflicts(context: Context): Conflict[] { 

        const streamType = this.stream.getType(context);

        if(!(streamType instanceof StreamType))
            return [ new NotAStream(this, streamType) ];

        return [];
    
    }

    computeType(context: Context): Type {
        // The type is the stream's type.
        const streamType = this.stream.getType(context);
        return streamType instanceof StreamType ? UnionType.make(streamType.type, NoneType.None) : new NotAStreamType(this, streamType);
    }

    getDependencies(): Expression[] {
        return [ this.stream ];
    }

    compile(context: Context): Step[] {
        return [ 
            new Start(this), 
            ...this.stream.compile(context), 
            new KeepStream(this), 
            new Finish(this) 
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        const stream = evaluator.popValue(StreamType.make(new AnyType()));
        if(!(stream instanceof Stream)) return new TypeException(evaluator, StreamType.make(new AnyType()), stream);

        return new Bool(this, evaluator.didStreamCauseReaction(stream));

    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.stream instanceof Expression) this.stream.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if(child === this.stream) return {
            "😀": TRANSLATE,
            eng: "stream"
        };
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "true if a stream changed"
        }
    }

    getStart() { return this.stream; }
    getFinish() { return this.change; }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Did a change to this stream cause the evaluation?"
        }
    }

}