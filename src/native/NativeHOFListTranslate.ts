import Bind from "../nodes/Bind";
import Expression from "../nodes/Expression";
import type FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MeasurementType from "../nodes/MeasurementType";
import Name from "../nodes/Name";
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
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import { LIST_TYPE_VAR_NAMES } from "./NativeConstants";

const INDEX = new Names([ new Name("index")]);
const LIST = new Names([ new Name("list")]);

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
                    evaluator.bind(INDEX, new Measurement(this, 1));
                    evaluator.bind(LIST, new List(this, []));
                    return undefined;
                }
            ),
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Apply the translator to the next item."
                },
                evaluator => {
                    const index = evaluator.resolve(INDEX);
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
                const list = evaluator.resolve(LIST);
                if(list instanceof List)
                    evaluator.bind(LIST, list.append(this, translatedValue));
                else return new TypeException(evaluator, new ListType(), list);

                // Increment the counter
                const index = evaluator.resolve(INDEX);
                if(index instanceof Measurement)
                    evaluator.bind(INDEX, index.add(this, new Measurement(this, 1)));
                else return new TypeException(evaluator, new MeasurementType(), index);

                // Jump to the conditional
                evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value | undefined {
        
        if(prior) return prior;

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