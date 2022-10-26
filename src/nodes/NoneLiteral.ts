import Token from "./Token";
import Expression from "./Expression";
import NoneType from "./NoneType";
import type Type from "./Type";
import type Node from "./Node";
import None from "../runtime/None";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Name from "./Name";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import { NONE_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Names from "./Names";

export default class NoneLiteral extends Expression {
    readonly none: Token;
    readonly names: Names;

    constructor(error?: Token, names?: Names) {
        super();

        this.none = error ?? new Token(NONE_SYMBOL, TokenType.NONE);
        this.names = names ?? new Names();
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new NoneLiteral(
            this.cloneOrReplaceChild(pretty, [ Token ], "none", this.none, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Name ], "aliases", this.names, original, replacement)
        ) as this; 
    }

    computeChildren() { return [ this.none, this.names ]; }
    computeConflicts() {}

    computeType(): Type {
        // Always of type none, with the optional name.
        return new NoneType(this.names, this.none);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(): Value {
        return new None(this.names);
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