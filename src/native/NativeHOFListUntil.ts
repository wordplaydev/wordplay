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
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import { LIST_TYPE_VAR_NAMES } from "./NativeConstants";

export default class NativeHOFListMap extends HOF {

    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();        
        this.hofType = hofType;
    }

    computeChildren() { return [] };
    computeType(): Type { return new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)); }

    compile(): Step[] { 
        return [
            new Start(this),
            // Initialize an iterator and an empty list in this scope.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Initialize an index and list"
                },
                evaluator => {
                    evaluator.bind("index", new Measurement(this, 1));
                    evaluator.bind("list", new List(this, []));
                    return undefined;
                }),
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Check the next item"
                },
                evaluator => {
                    const index = evaluator.resolve("index");
                    const list = evaluator.getEvaluationContext()?.getContext();
                    // If the index is past the last index of the list, jump to the end.
                    if(!(index instanceof Measurement)) return new TypeException(evaluator, new MeasurementType(), index);
                    else if(!(list instanceof List)) return new TypeException(evaluator, new ListType(), list);
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
                                const bindings = new Map<string, Value>();
                                // Bind the list value
                                (include.definition.inputs[0] as Bind).getNames().forEach(n =>  bindings.set(n, listValue));
                                // Apply the translator function to the value
                                evaluator.startEvaluation(new Evaluation(
                                    evaluator, 
                                    this,
                                    include.definition, 
                                    include.definition.expression, 
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
                    eng: "Add the next item to the list and go to the next item."
                },
                evaluator => {

                    // Get the boolean from the function evaluation.
                    const include = evaluator.popValue(new BooleanType());
                    if(!(include instanceof Bool)) return include;

                    // Get the current index.
                    const index = evaluator.resolve("index");
                    if(!(index instanceof Measurement))
                        return new TypeException(evaluator, new MeasurementType(), index);

                    // Get the list.
                    const list = evaluator.getEvaluationContext()?.getContext();
                    if(!(list instanceof List))
                        return new TypeException(evaluator, new ListType(), list);

                    const newList = evaluator.resolve("list");
                    if(!(include instanceof Bool)) return new TypeException(evaluator, new BooleanType(), include);
                    else if(!(newList instanceof List)) return new TypeException(evaluator, new ListType(), newList);
                    else {
                        // If the include decided yes, append the value.
                        if(include.bool) {
                            const listValue = list.get(index);
                            evaluator.bind("list", newList.append(this, listValue));
                        }
                        // Otherwise, don't loop, just go to the end.
                        else {
                            return undefined;
                        }
                    }

                    // Increment the counter
                    evaluator.bind("index", index.add(this, new Measurement(this, 1)));

                    // Jump to the conditional
                    evaluator.jump(-2);

                    return undefined;
                }),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        // Evaluate to the filtered list.
        return evaluator.resolve("list");
    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Include everything until we find a matching item."
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to the new truncated list."
        }
    }

}