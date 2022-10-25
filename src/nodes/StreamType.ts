import { REACTION_SYMBOL } from "../parser/Tokenizer";
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
import Unparsable from "./Unparsable";

export const STREAM_NATIVE_TYPE_NAME = "stream";

export default class StreamType extends Type {

    readonly stream: Token;
    readonly type: Type | Unparsable;

    constructor(type: Type | Unparsable, stream?: Token) {
        super();

        this.stream = stream ?? new Token(REACTION_SYMBOL, TokenType.REACTION);
        this.type = type;
    }

    computeChildren() {
        return [ this.stream, this.type ];
    }
    computeConflicts() {}

    accepts(type: Type, context: Context): boolean {
        return type instanceof StreamType && 
            this.type instanceof Type && 
            type.type instanceof Type && 
            this.type.accepts(type.type, context);
    }

    getNativeTypeName(): string { return STREAM_NATIVE_TYPE_NAME; }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new StreamType(
            this.cloneOrReplaceChild(pretty, [ Type, Unparsable ], "type", this.type, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token ], "stream", this.stream, original, replacement)
        ) as this; 
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.type) return new Replace(context.source, child, new TypePlaceholder());
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A stream type"
        }
    }

}