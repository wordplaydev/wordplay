import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Type from "../nodes/Type";
import type Step from "src/runtime/Step";
import Finish from "../runtime/Finish";
import Expression from "../nodes/Expression";
import Node from "../nodes/Node";
import { parseType, tokens } from "../parser/Parser";
import type Evaluation from "../runtime/Evaluation";
import type Bind from "../nodes/Bind";
import type Context from "../nodes/Context";
import type { TypeSet } from "../nodes/UnionType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import ValueException from "../runtime/ValueException";
import Start from "../runtime/Start";

export default class NativeExpression extends Expression {
    
    readonly type: Type;
    readonly evaluator: (requestor: Node, evaluator: Evaluation) => Value;
    readonly explanations: Translations;

    constructor(type: Type | string, evaluator: (requestor: Node, evaluator: Evaluation) => Value, explanations: Translations) {
        super();

        if(typeof type === "string") {
            let possibleType = parseType(tokens(type));
            this.type = possibleType;
        }
        else this.type = type;
        
        this.evaluator = evaluator;
        this.explanations = explanations;

    }
    
    computeConflicts() {}
    getGrammar() { return []; }
    computeType(): Type { return this.type; }
    getDependencies(): Expression[] { return []; }

    compile(): Step[] { return [ new Start(this), new Finish(this) ]; }
    evaluate(evaluator: Evaluator): Value | undefined {
        const requestor = evaluator.getCurrentEvaluation()?.currentStep()?.node;
        if(!(requestor instanceof Node)) return new ValueException(evaluator);
        const evaluation = evaluator.getCurrentEvaluation();
        return evaluation === undefined ? undefined : this.evaluator(requestor, evaluation);
    }

    /** Can't clone native expressions, there's only one of them! We just erase their parent and let whatever wants them claim them. */
    replace() { return this; }

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