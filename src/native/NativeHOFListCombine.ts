import Bind from "../nodes/Bind";
import Expression from "../nodes/Expression";
import type FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MeasurementType from "../nodes/MeasurementType";
import Names from "../nodes/Names";
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

const INDEX = Names.make([ "index" ]);
const COMBO = Names.make([ "initial" ]);

export default class NativeHOFListCombine extends HOF {

    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();        
        this.hofType = hofType;
    }

    computeType(): Type { return ListType.make(new NameType(LIST_TYPE_VAR_NAMES.eng)); }

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
                    evaluator.bind(INDEX, new Measurement(this, 1));
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
                    const index = evaluator.resolve(INDEX);
                    if(!(index instanceof Measurement))
                        return new TypeException(evaluator, MeasurementType.make(), index);

                    // Get the list we're processing.
                    const list = evaluator.getCurrentEvaluation()?.getClosure();
                    if(!(list instanceof List))
                        return new TypeException(evaluator, ListType.make(), list);

                    // Get the list we're processing.
                    const combination = evaluator.resolve(COMBO);
                    if(combination === undefined)
                        return new NameException(COMBO.getNames()[0], evaluator);

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
                            const bindings = new Map<Names, Value>();
                            // Bind the current combo
                            bindings.set(translator.definition.inputs[0].names, combination);
                            // Bind the list value
                            bindings.set(translator.definition.inputs[1].names, listValue);
                            // Apply the translator function to the value
                            evaluator.startEvaluation(new Evaluation(
                                evaluator, 
                                this,
                                translator.definition, 
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
                    evaluator.bind(COMBO, evaluator.popValue(undefined));

                    // Get the current index.
                    const index = evaluator.resolve(INDEX);
                    if(!(index instanceof Measurement))
                        return new TypeException(evaluator, MeasurementType.make(), index);
                    
                    // Increment the index.
                    evaluator.bind(INDEX, index.add(this, new Measurement(this, 1)));

                    // Jump back to the loop.
                    evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value | undefined {
        
        if(prior) return prior;

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