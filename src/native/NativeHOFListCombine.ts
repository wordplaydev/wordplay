import Bind from "../nodes/Bind";
import Expression from "../nodes/Expression";
import type FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Action from "../runtime/Action";
import Evaluation from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import FunctionValue from "../runtime/FunctionValue";
import List from "../runtime/List";
import Measurement from "../runtime/Measurement";
import NameException from "../runtime/NameException";
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import { LIST_TYPE_VAR_NAMES } from "./NativeConstants";

export default class NativeHOFListCombine extends HOF {

    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();        
        this.hofType = hofType;
    }

    computeType(): Type { return new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)); }

    compile(): Step[] { 
        return [
            new Start(this),
            // Initialize an iterator and the current combination.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Start at the first item."
                },
                evaluator => {
                    evaluator.bind("index", new Measurement(this, 1));
                    return undefined;
                }
            ),
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Apply the function to the current item."
                },
                evaluator => {
                    // Get the index.
                    const index = evaluator.resolve("index");
                    if(!(index instanceof Measurement))
                        return new TypeException(evaluator, new MeasurementType(), index);

                    // Get the list we're processing.
                    const list = evaluator.getEvaluationContext()?.getContext();
                    if(!(list instanceof List))
                        return new TypeException(evaluator, new ListType(), list);

                    // Get the list we're processing.
                    const combination = evaluator.resolve("initial");
                    if(combination === undefined)
                        return new NameException(evaluator, "initial");

                    // If we're past the end of the list, jump past the loop.
                    if(index.greaterThan(this, list.length(this)).bool)
                        evaluator.jump(1);
                    // Otherwise, apply the given translator function to the current list value.
                    else {
                        const translator = evaluator.resolve("combiner");
                        const listValue = list.get(index);
                        if(translator instanceof FunctionValue && 
                            translator.definition.expression instanceof Expression && 
                            translator.definition.inputs[0] instanceof Bind &&
                            translator.definition.inputs[1] instanceof Bind) {
                            const bindings = new Map<string, Value>();
                            // Bind the current combo
                            (translator.definition.inputs[0] as Bind).getNames().forEach(n => bindings.set(n, combination));
                            // Bind the list value
                            (translator.definition.inputs[1] as Bind).getNames().forEach(n =>  bindings.set(n, listValue));
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
                        else return new TypeException(evaluator, this.hofType, list);
                    }
                    return undefined;
                }
            ),
            // Save the translated value and then jump to the conditional.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Update the combined value."
                },
                evaluator => {

                    // Update the combo.
                    evaluator.bind("initial", evaluator.popValue(undefined));

                    // Get the current index.
                    const index = evaluator.resolve("index");
                    if(!(index instanceof Measurement))
                        return new TypeException(evaluator, new MeasurementType(), index);
                    
                    // Increment the index.
                    evaluator.bind("index", index.add(this, new Measurement(this, 1)));

                    // Jump back to the loop.
                    evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {

        // Return the combo.
        return evaluator.resolve("initial");

    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Go through each list item and create something larger from each part."
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to the thing we made."
        }
    }

}