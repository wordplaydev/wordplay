import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Type from "../nodes/Type";
import type Step from "src/runtime/Step";
import Finish from "../runtime/Finish";
import Expression from "../nodes/Expression";
import Node from "../nodes/Node";
import { parseType, tokens } from "../parser/Parser";
import Unparsable from "../nodes/Unparsable";
import UnknownType from "../nodes/UnknownType";
import type Evaluation from "../runtime/Evaluation";
import type Bind from "../nodes/Bind";
import type Context from "../nodes/Context";
import type { TypeSet } from "../nodes/UnionType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import ValueException from "../runtime/ValueException";

export default class NativeExpression extends Expression {
    
    readonly type: Type;
    readonly evaluator: (requestor: Node, evaluator: Evaluation) => Value;
    readonly explanations: Translations;

    constructor(type: Type | string, evaluator: (requestor: Node, evaluator: Evaluation) => Value, explanations: Translations) {
        super();

        if(typeof type === "string") {
            let possibleType = parseType(tokens(type));
            if(possibleType instanceof Unparsable)
                possibleType = new UnknownType(possibleType);
            this.type = possibleType;
        }
        else this.type = type;
        
        this.evaluator = evaluator;
        this.explanations = explanations;

        // Claim the type so that it's part 
        this.type._parent = this;

    }
    
    computeConflicts() {}
    getGrammar() { return []; }
    computeType(): Type { return this.type; }
    compile(): Step[] { return [ new Finish(this) ]; }
    evaluate(evaluator: Evaluator): Value | undefined {
        const requestor = evaluator.getEvaluationContext()?.currentStep()?.node;
        if(!(requestor instanceof Node)) return new ValueException(evaluator);
        const evaluation = evaluator.getEvaluationContext();
        return evaluation === undefined ? undefined : this.evaluator(requestor, evaluation);
    }

    /** Can't clone native expressions, there's only one of them! */
    clone() { return this; }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { context; bind; original; return current; }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A native expression"
        }
    }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations { return this.explanations; }

}