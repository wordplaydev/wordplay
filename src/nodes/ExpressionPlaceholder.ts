import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import type Value from "../runtime/Value";
import type Step from "../runtime/Step";
import Placeholder from "../conflicts/Placeholder";
import Halt from "../runtime/Halt";
import type Bind from "./Bind";
import type Context from "./Context";
import type TypeSet from "./TypeSet";
import UnparsableException from "../runtime/UnparsableException";
import type Evaluator from "../runtime/Evaluator";
import UnimplementedException from "../runtime/UnimplementedException";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import PlaceholderToken from "./PlaceholderToken";
import UnimplementedType from "./UnimplementedType";

const ExpressionLabels: Translations = {
    "😀": TRANSLATE,
    eng: "value"
};

export default class ExpressionPlaceholder extends Expression {
    
    readonly placeholder: Token;

    constructor(etc?: Token) {
        super();

        this.placeholder = etc ?? new PlaceholderToken();

        this.computeChildren();

    }

    static make() {
        return new ExpressionPlaceholder(new PlaceholderToken());
    }

    getGrammar() { 
        return [
            { name: "placeholder", types:[ Token ] },
        ];
    }

    clone(original?: Node, replacement?: Node) { 
        return new ExpressionPlaceholder(
            this.replaceChild("placeholder", this.placeholder, original, replacement)
        ) as this; 
    }

    computeConflicts(): Conflict[] { 
        return [ new Placeholder(this) ];
    }

    computeType(): Type { return new UnimplementedType(this); }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [ new Halt(evaluator => new UnimplementedException(evaluator), this) ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;        
        return new UnparsableException(evaluator, this);
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { bind; original; context; return current; }
     
    getChildPlaceholderLabel(child: Node, context: Context): Translations | undefined {
        if(child === this.placeholder) {
            const parent = context.get(this)?.getParent();
            // See if the parent has a label.
            return parent?.getChildPlaceholderLabel(this, context) ?? ExpressionLabels;
        }
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "An expression placeholder"
        }
    }

    getStart() { return this.placeholder; }
    getFinish() { return this.placeholder; }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "Can't evaluate a placeholder."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Can't evaluate a placeholder."
        }
    }

}