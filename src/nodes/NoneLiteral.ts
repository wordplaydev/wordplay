import Token from "./Token";
import Expression from "./Expression";
import NoneType from "./NoneType";
import type Type from "./Type";
import type Node from "./Node";
import None from "../runtime/None";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import type Bind from "./Bind";
import type Context from "./Context";
import type TypeSet from "./TypeSet";
import { NONE_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type Evaluator from "../runtime/Evaluator";
import StartFinish from "../runtime/StartFinish";

export default class NoneLiteral extends Expression {

    readonly none: Token;
 
    constructor(none: Token) {
        super();

        this.none = none;

        this.computeChildren();

    }

    static make() {
        return new NoneLiteral(new Token(NONE_SYMBOL, TokenType.NONE));
    }

    getGrammar() { 
        return [
            { name: "none", types:[ Token ] },
        ]; 
    }

    clone(original?: Node, replacement?: Node) { 
        return new NoneLiteral(
            this.replaceChild("none", this.none, original, replacement)
        ) as this; 
    }

    computeConflicts() {}

    computeType(): Type {
        return NoneType.None;
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [ new StartFinish(this) ];
    }

    evaluate(_: Evaluator, prior: Value | undefined): Value {
        
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

}