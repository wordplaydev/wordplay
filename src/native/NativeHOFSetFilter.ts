import Bind from "../nodes/Bind";
import BooleanType from "../nodes/BooleanType";
import Expression from "../nodes/Expression";
import type FunctionType from "../nodes/FunctionType";
import MeasurementType from "../nodes/MeasurementType";
import Names from "../nodes/Names";
import NameType from "../nodes/NameType";
import SetType from "../nodes/SetType";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Action from "../runtime/Action";
import Bool from "../runtime/Bool";
import Evaluation from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import FunctionValue from "../runtime/FunctionValue";
import Measurement from "../runtime/Measurement";
import Set from "../runtime/Set";
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import { SET_TYPE_VAR_NAMES } from "./NativeConstants";

const INDEX = Names.make([ "index" ]);
const SET = Names.make([ "set" ]);

export default class NativeHOFSetFilter extends HOF {

    readonly hofType: FunctionType;

    constructor(hofType: FunctionType) {
        super();        
        this.hofType = hofType
    }

    computeType(): Type { return SetType.make(new NameType(SET_TYPE_VAR_NAMES.eng)); }

    compile(): Step[] { 
        return [
            new Start(this),
            // Initialize an iterator and an empty list in this scope.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Initialize an index and new set."
                }, 
                evaluator => {
                    evaluator.bind(INDEX, new Measurement(this, 1));
                    evaluator.bind(SET, new Set(this, []));
                    return undefined;
                }),
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Check the next set value."
                },
                evaluator => {
                    const index = evaluator.resolve(INDEX);
                    const set = evaluator.getCurrentEvaluation()?.getClosure();
                    // If the index is past the last index of the list, jump to the end.
                    if(!(index instanceof Measurement)) return new TypeException(evaluator, MeasurementType.make(), index);
                    else if(!(set instanceof Set)) return new TypeException(evaluator, SetType.make(), set);
                    else {
                        if(index.greaterThan(this, set.size(this)).bool)
                            evaluator.jump(1);
                        // Otherwise, apply the given translator function to the current list value.
                        else {
                            const checker = evaluator.resolve("checker");
                            const setValue = set.values[index.num.toNumber() - 1];
                            if(checker instanceof FunctionValue && 
                                checker.definition.expression instanceof Expression && 
                                checker.definition.inputs[0] instanceof Bind) {
                                const bindings = new Map<Names, Value>();
                                // Bind the list value
                                bindings.set(checker.definition.inputs[0].names, setValue);
                                // Apply the translator function to the value
                                evaluator.startEvaluation(new Evaluation(
                                    evaluator,
                                    this,
                                    checker.definition, 
                                    checker.context, 
                                    bindings
                                ));
                            }
                            else return new TypeException(evaluator, this.hofType, checker);
                        }
                    }
                }),
            // Save the translated value and then jump to the conditional.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Include the value if it matched."
                },
                evaluator => {

                    // Get the boolean from the function evaluation.
                    const include = evaluator.popValue(BooleanType.make());
                    if(!(include instanceof Bool)) return include;

                    // Get the current index.
                    const index = evaluator.resolve(INDEX);
                    if(!(index instanceof Measurement))
                        return new TypeException(evaluator, MeasurementType.make(), index);

                    const set = evaluator.getCurrentEvaluation()?.getClosure();
                    if(!(set instanceof Set))
                        return new TypeException(evaluator, SetType.make(), set);

                    // If the include decided yes, append the value.
                    const newSet = evaluator.resolve(SET);
                    if(newSet instanceof Set) {
                        if(include.bool) {
                            const setValue = set.values[index.num.toNumber() - 1];
                            evaluator.bind(SET, newSet.add(this, setValue));
                        }
                    }
                    else return new TypeException(evaluator, SetType.make(), newSet);

                    // Increment the counter
                    evaluator.bind(INDEX, index.add(this, new Measurement(this, 1)));

                    // Jump to the conditional
                    evaluator.jump(-2);

                    return undefined;
                }),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        
        if(prior) return prior;

        // Evaluate to the filtered list.
        return evaluator.resolve("set");
    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Go through each value in the set and see if it matches."
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to the new set."
        }
    }

}