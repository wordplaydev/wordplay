import { SET_NATIVE_TYPE_NAME, SET_TYPE_VAR_NAMES } from "../native/NativeConstants";
import type Context from "./Context";
import NativeType from "./NativeType";
import type Node from "./Node";
import Token from "./Token";
import Type from "./Type";
import { getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import type Transform from "../transforms/Transform"
import Replace from "../transforms/Replace";
import TypePlaceholder from "./TypePlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import SetOpenToken from "./SetOpenToken";
import SetCloseToken from "./SetCloseToken";

export default class SetType extends NativeType {

    readonly open: Token;
    readonly key?: Type;
    readonly close?: Token;

    constructor(open: Token, key?: Type, close?: Token) {
        super();

        this.open = open;
        this.key = key;
        this.close = close;

        this.computeChildren();

    }

    static make(key?: Type) {
        return new SetType(new SetOpenToken(), key, new SetCloseToken());
    }

    getGrammar() { 
        return [
            { name: "open", types:[ Token ] },
            { name: "key", types:[ Type, undefined ] },
            { name: "close", types:[ Token ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new SetType(
            this.replaceChild("open", this.open, original, replacement), 
            this.replaceChild("key", this.key, original, replacement),
            this.replaceChild("close", this.close, original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    accepts(type: Type, context: Context): boolean { 
        // If they have one, then they must be compable, and if there is a value type, they must be compatible.
        return  type instanceof SetType &&
                (
                    // If the key type isn't specified, any will do.
                    this.key === undefined ||
                    (
                        this.key instanceof Type &&
                        type.key instanceof Type &&
                        this.key.accepts(type.key, context)
                    )
                );
    }

    getNativeTypeName(): string { return SET_NATIVE_TYPE_NAME; }

    resolveTypeVariable(name: string): Type | undefined { 
        return Object.values(SET_TYPE_VAR_NAMES).includes(name) && this.key instanceof Type ? this.key : undefined;
    };

    getChildReplacement(child: Node, context: Context): Transform[] | undefined  {

        if(child === this.key)
            return getPossibleTypeReplacements(child, context);

    }

    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter() { return undefined; }
    
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.key) return new Replace(context, child, new TypePlaceholder());
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A set type"
        }
    }

}