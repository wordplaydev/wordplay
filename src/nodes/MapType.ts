import { MAP_KEY_TYPE_VAR_NAMES, MAP_NATIVE_TYPE_NAME, MAP_VALUE_TYPE_VAR_NAMES } from "../native/NativeConstants";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import { getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import type Transform from "../transforms/Transform"
import BindToken from "./BindToken";
import TypePlaceholder from "./TypePlaceholder";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class MapType extends NativeType {

    readonly open: Token;
    readonly key?: Type;
    readonly bind: Token;
    readonly value?: Type;
    readonly close?: Token;

    constructor(open: Token, key: Type | undefined, bind: Token, value: Type | undefined, close?: Token) {
        super();

        this.open = open;
        this.key = key;
        this.bind = bind;
        this.value = value;
        this.close = close;

        this.computeChildren();

    }

    static make(key?: Type, value?: Type) {
        return new MapType(
            new Token(SET_OPEN_SYMBOL, TokenType.SET_OPEN),
            key,
            new BindToken(),
            value,
            new Token(SET_CLOSE_SYMBOL, TokenType.SET_CLOSE)
        );
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "key", types:[ Type, undefined ] },
            { name: "bind", types:[ Token ] },
            { name: "value", types:[ Type, undefined ] },
            { name: "close", types:[ Token ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new MapType(
            this.replaceChild("key", this.key, original, replacement), 
            this.replaceChild("value", this.value, original, replacement),
            this.replaceChild("open", this.open, original, replacement),
            this.replaceChild("bind", this.bind, original, replacement), 
            this.replaceChild("close", this.close, original, replacement) 
        ) as this; 
    }

    computeConflicts() {}

    accepts(type: Type, context: Context): boolean { 
        return  type instanceof MapType &&
                // If they have one, then they must be compable, and if there is a value type, they must be compatible.
                (
                    // If the key type isn't specified, any will do.
                    (this.key === undefined ||
                        (
                            this.key instanceof Type &&
                            type.key instanceof Type &&
                            this.key.accepts(type.key, context)
                         )
                    ) &&
                    // If the value type isn't specified, any will do.
                    (this.value === undefined ||
                        (
                            this.value instanceof Type &&
                            type.value instanceof Type &&
                            this.value.accepts(type.value, context)
                        )
                    )
                )
    }

    getNativeTypeName(): string { return MAP_NATIVE_TYPE_NAME; }

    resolveTypeVariable(name: string): Type | undefined { 
        return Object.values(MAP_KEY_TYPE_VAR_NAMES).includes(name) && this.key instanceof Type ? this.key : 
            Object.values(MAP_VALUE_TYPE_VAR_NAMES).includes(name) && this.value instanceof Type ? this.value :
            undefined;
    };

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A map type"
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {

        if(child === this.key || child === this.value)
            return getPossibleTypeReplacements(child, context);

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.key || child === this.value) return new Replace(context, child, new TypePlaceholder());
    }
}