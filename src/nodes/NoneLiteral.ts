import Token from "./Token";
import Expression from "./Expression";
import NoneType from "./NoneType";
import type Type from "./Type";
import type Node from "./Node";
import None from "../runtime/None";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import { NONE_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class NoneLiteral extends Expression {
    readonly none: Token;

    constructor(none?: Token) {
        super();

        this.none = none ?? new Token(NONE_SYMBOL, TokenType.NONE);
    }

    getChildNames() { return ["none"]; }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new NoneLiteral(
            this.cloneOrReplaceChild(pretty, [ Token ], "none", this.none, original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    computeType(): Type {
        return new NoneType();
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(): Value {
        return new None(this);
    }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to this none value!"
        }
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A none value"
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }
    getChildRemoval() { return undefined; }

}