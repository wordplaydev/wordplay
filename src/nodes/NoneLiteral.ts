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
import Start from "../runtime/Start";
import type Evaluator from "../runtime/Evaluator";

export default class NoneLiteral extends Expression {

    readonly none: Token;
 
    constructor(none?: Token) {
        super();

        this.none = none ?? new Token(NONE_SYMBOL, TokenType.NONE);

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "none", types:[ Token ] },
        ]; 
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new NoneLiteral(
            this.replaceChild(pretty, "none", this.none, original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    computeType(): Type {
        return new NoneType();
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [ new Start(this), new Finish(this) ];
    }

    evaluate(_: Evaluator, prior: Value | undefined): Value | undefined {
        
        if(prior) return prior;
        return new None(this);
    }

    getStart() { return this.none; }
    getFinish() { return this.none; }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "Let's make a none!"
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "We made a none!"
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