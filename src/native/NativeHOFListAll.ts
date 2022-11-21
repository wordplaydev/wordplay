import Bind from "../nodes/Bind";
import BooleanType from "../nodes/BooleanType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Expression from "../nodes/Expression";
import type FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MeasurementType from "../nodes/MeasurementType";
import Action from "../runtime/Action";
import Bool from "../runtime/Bool";
import Evaluation from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import FunctionValue from "../runtime/FunctionValue";
import List from "../runtime/List";
import Measurement from "../runtime/Measurement";
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import Names from "../nodes/Names";
import Name from "../nodes/Name";

const INDEX = new Names([ new Name("index")]);

export default class NativeHOFListAll extends HOF {

    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();
        this.hofType = hofType;
    }

    computeType() { return new BooleanType(); }

    compile(): Step[] { 
        return [
            new Start(this, 
                evaluator => {
                    evaluator.bind(INDEX, new Measurement(this, 1));
                    return undefined;
                }
            ),
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Translate the next list element into a boolean."
                }, 
                evaluator => {
                    const index = evaluator.resolve(INDEX);
                    const list = evaluator.getEvaluationContext()?.getContext();
                    // If the index is past the last index of the list, jump to the end.
                    if(!(index instanceof Measurement)) return new TypeException(evaluator, new MeasurementType(), index);
                    else if(!(list instanceof List)) return new TypeException(evaluator, new ListType(), list);
                    else {
                        if(index.greaterThan(this, list.length(this, )).bool)
                            evaluator.jump(1);
                        // Otherwise, apply the given matcher function to the current list value.
                        else {
                            const translator = evaluator.resolve("matcher");
                            const listValue = list.get(index);
                            if(translator instanceof FunctionValue && 
                                translator.definition.expression instanceof Expression && 
                                translator.definition.inputs[0] instanceof Bind) {
                                const bindings = new Map<Names, Value>();
                                // Bind the list value
                                bindings.set(translator.definition.inputs[0].names, listValue);
                                // Apply the translator function to the value
                                evaluator.startEvaluation(new Evaluation(
                                    evaluator, 
                                    this,
                                    translator.definition, 
                                    translator.definition.expression, 
                                    translator.context, 
                                    bindings
                                ));
                            }
                            else return new TypeException(evaluator, this.hofType, translator);
                        }
                    }
                    return undefined;
                    
                }
            ),
            // Save the translated value and then jump to the conditional.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Is it true? If so, check the next list item, if there is one, otherwise finish."
                }, 
                evaluator => {

                    // Get the bool from the matcher
                    const matched = evaluator.popValue(new BooleanType());
                    if(!(matched instanceof Bool)) return matched;

                    // Get the current index
                    const index = evaluator.resolve(INDEX);
                    if(!(index instanceof Measurement))
                        return new TypeException(evaluator, new MeasurementType(), matched);
        
                    // If it matched, increment and jump to the conditional.
                    if(matched.bool) {
                        evaluator.bind(INDEX, index.add(this, new Measurement(this, 1)));
                        evaluator.jump(-2);
                    }
                    // Otherwise, go to the last step and fail.

                    return undefined;
                }
            ),
            new Finish(this)
        ];
    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "We'll go through each item, seeing if the matcher function evaluates to true."
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "If we made it to the end of the list, then evaluate to true, otherwise false."
        }
    }

    evaluate(evaluator: Evaluator): Value | undefined {

        // Get the index and list.
        const index = evaluator.resolve("index");
        if(!(index instanceof Measurement))
            return new TypeException(evaluator, new MeasurementType(), index);
        const list = evaluator.getEvaluationContext()?.getContext();
        if(!(list instanceof List))
            return new TypeException(evaluator, new ListType(), list);

        // Evaluate to true if we made it past the length of the list, false otherwise.
        return index.greaterThan(this, list.length(this));

    }

}