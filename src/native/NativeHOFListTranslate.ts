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
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import { LIST_TYPE_VAR_NAMES } from "./NativeConstants";

export default class NativeHOFListTranslate extends HOF {

    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();        
        this.hofType = hofType;
    }

    computeType(): Type { return new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)); }

    compile(): Step[] { 
        return [
            new Start(this),
            // Initialize an iterator and an empty list in this scope.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Initialize an index and new list."
                },
                evaluator => {
                    evaluator.bind("index", new Measurement(this, 1));
                    evaluator.bind("list", new List(this, []));
                    return undefined;
                }
            ),
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Apply the translator to the next item."
                },
                evaluator => {
                    const index = evaluator.resolve("index");
                    const list = evaluator.getEvaluationContext()?.getContext();
                    // If the index is past the last index of the list, jump to the end.
                    if(!(index instanceof Measurement)) return new TypeException(evaluator, new MeasurementType(), index);
                    else if(!(list instanceof List)) return new TypeException(evaluator, new ListType(), index);
                    else {
                        if(index.greaterThan(this, list.length(this)).bool)
                            evaluator.jump(1);
                        // Otherwise, apply the given translator function to the current list value.
                        else {
                            const translator = evaluator.resolve("translator");
                            const listValue = list.get(index);
                            if(translator instanceof FunctionValue && 
                                translator.definition.expression instanceof Expression && 
                                translator.definition.inputs[0] instanceof Bind) {
                                const bindings = new Map<string, Value>();
                                // Bind the list value
                                (translator.definition.inputs[0] as Bind).getNames().forEach(name => bindings.set(name, listValue));
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
                }),
            // Save the translated value and then jump to the conditional.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Add the translated item to the new list."
                },
                evaluator => {

                // Get the translated value.
                const translatedValue = evaluator.popValue(undefined);

                // Append the translated value to the list.
                const list = evaluator.resolve("list");
                if(list instanceof List)
                    evaluator.bind("list", list.append(this, translatedValue));
                else return new TypeException(evaluator, new ListType(), list);

                // Increment the counter
                const index = evaluator.resolve("index");
                if(index instanceof Measurement)
                    evaluator.bind("index", index.add(this, new Measurement(this, 1)));
                else return new TypeException(evaluator, new MeasurementType(), index);

                // Jump to the conditional
                evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        // Evaluate to the new list.
        return evaluator.resolve("list");
    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Translate items in the list, one by one."
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to the new list."
        }
    }

}