import { MAP_KEY_TYPE_VAR_NAMES, MAP_NATIVE_TYPE_NAME, MAP_VALUE_TYPE_VAR_NAMES } from "../native/NativeConstants";
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unparsable from "./Unparsable";
import { getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import type Transform from "../transforms/Transform"
import BindToken from "./BindToken";
import TypePlaceholder from "./TypePlaceholder";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class MapType extends NativeType {

    readonly open: Token;
    readonly key?: Type | Unparsable;
    readonly bind: Token;
    readonly value?: Type | Unparsable;
    readonly close: Token;

    constructor(key?: Type | Unparsable, value?: Type | Unparsable, open?: Token, bind?: Token, close?: Token) {
        super();

        this.open = open ?? new Token(SET_OPEN_SYMBOL, TokenType.SET_OPEN);
        this.close = close ?? new Token(SET_CLOSE_SYMBOL, TokenType.SET_CLOSE);
        this.bind = bind ?? new BindToken();
        this.key = key;
        this.value = value;
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "key", types:[ Type, Unparsable, undefined ] },
            { name: "bind", types:[ Token ] },
            { name: "value", types:[ Type, Unparsable, undefined ] },
            { name: "close", types:[ Token ] },
        ];
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

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new MapType(
            this.cloneOrReplaceChild(pretty, [ Type, Unparsable, undefined ], "key", this.key, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Type, Unparsable ], "value", this.value, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "open", this.open, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "bind", this.bind, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Token], "close", this.close, original, replacement) 
        ) as this; 
    }

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
        if(child === this.key || child === this.value) return new Replace(context.source, child, new TypePlaceholder());
    }
}