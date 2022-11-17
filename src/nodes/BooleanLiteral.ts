import BooleanType from "./BooleanType";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Value from "../runtime/Value";
import Bool from "../runtime/Bool";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import type Node from "./Node";
import { FALSE_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import type Bind from "./Bind";
import type Context from "./Context";
import type { TypeSet } from "./UnionType";
import TokenType from "./TokenType";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class BooleanLiteral extends Expression {

    readonly value: Token;

    constructor(value: Token | boolean) {
        super();
     
        this.value = value === true || value === false ? new Token(value ? TRUE_SYMBOL : FALSE_SYMBOL, TokenType.BOOLEAN) : value;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "value", types:[ Token ] },
        ]; 
    }

    computeConflicts() {}

    computeType(): Type {
        return new BooleanType();
    }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(): Value {
        return new Bool(this, this.bool());
    }

    bool(): boolean {
        return this.value.text.toString() === TRUE_SYMBOL;
    }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new BooleanLiteral(
            this.cloneOrReplaceChild(pretty, "value", this.value, original, replacement)
        ).label(this._label) as this; 
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined { 
        return [
            new Replace(context.source, child, new Token(!this.bool() ? TRUE_SYMBOL : FALSE_SYMBOL, TokenType.BOOLEAN))
        ];
    }

    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }
    getChildRemoval(): Transform | undefined { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: `${this.bool() ? "True" : "False"}`
        }
    }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to a bool"
        }
    }

}