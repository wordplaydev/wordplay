import Token from "./Token";
import Expression from "./Expression";
import NoneType from "./NoneType";
import type Type from "./Type";
import type Node from "./Node";
import None from "../runtime/None";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Alias from "./Alias";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import { NONE_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform";

export default class NoneLiteral extends Expression {
    readonly none: Token;
    readonly aliases: Alias[];

    constructor(error?: Token, aliases?: Alias[]) {
        super();

        this.none = error ?? new Token(NONE_SYMBOL, TokenType.NONE);
        this.aliases = aliases ?? [];
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new NoneLiteral(
            this.cloneOrReplaceChild(pretty, [ Token ], "none", this.none, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ Alias ], "aliases", this.aliases, original, replacement)
        ) as this; 
    }

    computeChildren() { return [ this.none, ...this.aliases ]; }
    computeConflicts() {}

    computeType(): Type {
        // Always of type none, with the optional name.
        return new NoneType(this.aliases, this.none);
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(): Value {
        return new None(this.aliases);
    }

    getStartExplanations() { return this.getFinishExplanations(); }

    getFinishExplanations() {
        return {
            "eng": "Evaluate to this none value!"
        }
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getDescriptions() {
        return {
            eng: "A none value"
        }
    }

    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

}