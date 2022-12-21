import type { NativeTypeName } from "../native/NativeConstants";
import { STREAM_SYMBOL } from "../parser/Tokenizer";
import Replace from "../transforms/Replace";
import type Transform from "../transforms/Transform";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Type from "./Type";
import TypePlaceholder from "./TypePlaceholder";
import type TypeSet from "./TypeSet";

export const STREAM_NATIVE_TYPE_NAME = "stream";

export default class StreamType extends Type {

    readonly stream: Token;
    readonly type: Type;

    constructor(stream: Token, type: Type, ) {
        super();

        this.stream = stream;
        this.type = type;

        this.computeChildren();

    }

    static make(type: Type) {
        return new StreamType(new Token(STREAM_SYMBOL, TokenType.STREAM_TYPE), type);
    }

    getGrammar() { 
        return [
            { name: "stream", types:[ Token ] },
            { name: "type", types:[ Type ] },
        ]; 
    }

    computeConflicts() {}

    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every(type => 
            type instanceof StreamType && 
            this.type.accepts(type.type, context)
        );
    }

    getNativeTypeName(): NativeTypeName { return "stream"; }

    replace(original?: Node, replacement?: Node) { 
        return new StreamType(
            this.replaceChild("type", this.type, original, replacement), 
            this.replaceChild("stream", this.stream, original, replacement)
        ) as this; 
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.type) return new Replace(context, child, new TypePlaceholder());
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A stream type"
        }
    }

}