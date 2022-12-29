import Bind from "../nodes/Bind";
import BooleanType from "../nodes/BooleanType";
import Expression from "../nodes/Expression";
import type FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Action from "../runtime/Action";
import Bool from "../runtime/Bool";
import Evaluation from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import FunctionValue from "../runtime/FunctionValue";
import List from "../runtime/List";
import Measurement from "../runtime/Measurement";
import None from "../runtime/None";
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import { LIST_TYPE_VAR_NAMES } from "./NativeConstants";
import Names from "../nodes/Names";

const INDEX = Names.make([ "index" ]);

export default class NativeHOFListFind extends HOF {

    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();        
        this.hofType = hofType;
    }

    computeType(): Type { return new NameType(LIST_TYPE_VAR_NAMES.eng); }

    compile(): Step[] { 
        return [
            new Start(this),
            // Initialize an iterator and an empty list in this scope.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Start at the first item."
                },
                evaluator => {
                    evaluator.bind(INDEX, new Measurement(this, 1));
                    return undefined;
                }),
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Apply the checker to the next item."
                },
                evaluator => {
                    const index = evaluator.resolve(INDEX);
                    const list = evaluator.getCurrentEvaluation()?.getClosure();
                    // If the index is past the last index of the list, jump to the end.
                    if(!(index instanceof Measurement)) return new TypeException(evaluator, MeasurementType.make(), index);
                    else if(!(list instanceof List)) return new TypeException(evaluator, ListType.make(), list);
                    else {
                        if(index.greaterThan(this, list.length(this)).bool)
                            evaluator.jump(1);
                        // Otherwise, apply the given translator function to the current list value.
                        else {
                            const include = evaluator.resolve("checker");
                            const listValue = list.get(index);
                            if(include instanceof FunctionValue && 
                                include.definition.expression instanceof Expression && 
                                include.definition.inputs[0] instanceof Bind) {
                                const bindings = new Map<Names, Value>();
                                // Bind the list value
                                bindings.set(include.definition.inputs[0].names, listValue);
                                // Apply the translator function to the value
                                evaluator.startEvaluation(new Evaluation(
                                    evaluator, 
                                    this,
                                    include.definition, 
                                    include.context, 
                                    bindings
                                ));
                            }
                            else return new TypeException(evaluator, this.hofType, include);
                        }
                    }
                }),
            // Save the translated value and then jump to the conditional.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "If it matches, we found! Otherwise, keep checking."
                },
                evaluator => {

                // Get the boolean from the function evaluation.
                const matched = evaluator.popValue(BooleanType.make());
                if(!(matched instanceof Bool)) return matched;

                // If this matches, skip the loop.
                if(matched.bool)
                    return undefined;

                // Get the current index.
                const index = evaluator.resolve(INDEX);
                if(!(index instanceof Measurement))
                    return new TypeException(evaluator, MeasurementType.make(), index);

                // If it doesn't match, increment the counter and jump back to the conditional.
                evaluator.bind(INDEX, index.add(this, new Measurement(this, 1)));
                evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        // Get the current index.
        const index = evaluator.resolve("index");
        if(!(index instanceof Measurement))
            return new TypeException(evaluator, MeasurementType.make(), index);

        // Get the list.
        const list = evaluator.getCurrentEvaluation()?.getClosure();
        if(!(list instanceof List))
            return new TypeException(evaluator, ListType.make(), list);

        // If we're past the end of the list, return nothing. Otherwise return the value at the index.
        return index.greaterThan(this, list.length(this)).bool ? 
            new None(NotFoundAliases) : 
            list.get(index);

    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Move from the beginning to the end in search for a match."
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to the match or none."
        }
    }

}

const NotFound = {
    eng: "notfound",
    "😀": TRANSLATE
}
const NotFoundAliases = Names.make(NotFound);
