import type { NativeTypeName } from "../native/NativeConstants";
import type Node from "./Node";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations";
import Type from "./Type";

export default abstract class UnknownType<ExpressionType extends Node> extends Type {

    readonly expression: ExpressionType;
    readonly why: Type | undefined;

    constructor(expression: ExpressionType, why: Type | undefined) {
        super();

        this.expression = expression;
        this.why = why;

    }
    
    getGrammar() { return []; }
    computeConflicts() {}
    acceptsAll() { return false; }
    getNativeTypeName(): NativeTypeName { return "unknown"; }
    replace() { return this; }

    toWordplay() { return "⁇"; }
    
    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getReasons(): UnknownType<any>[] {
        return [ this, ...(this.why instanceof UnknownType ? [ ...this.why.getReasons() ] : [] ) ];
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: `unknown, because ${this.getReasons().map(unknown => unknown.getReason().eng).join(", because")}`
        };
    }

    abstract getReason(): Translations;

}