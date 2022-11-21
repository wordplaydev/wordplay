import Bind from "../nodes/Bind";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Expression from "../nodes/Expression";
import type FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MapType from "../nodes/MapType";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import type Type from "../nodes/Type";
import Action from "../runtime/Action";
import Evaluation from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import FunctionValue from "../runtime/FunctionValue";
import MapValue from "../runtime/Map";
import Measurement from "../runtime/Measurement";
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import { LIST_TYPE_VAR_NAMES } from "./NativeConstants";
import Names from "../nodes/Names";
import Name from "../nodes/Name";

const INDEX = new Names([ new Name("index")]);
const MAP = new Names([ new Name("map")]);

export default class NativeHOFMapTranslate extends HOF {

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
                    eng: "Initialize an index and the new map."
                },
                evaluator => {
                    evaluator.bind(INDEX, new Measurement(this, 1));
                    evaluator.bind(MAP, new MapValue(this, []));
                    return undefined;
                }
            ),
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Apply the translator to the next key."
                },
                evaluator => {
                    const index = evaluator.resolve(INDEX);
                    const map = evaluator.getEvaluationContext()?.getContext();
                    // If the index is past the last index of the list, jump to the end.
                    if(!(index instanceof Measurement)) return new TypeException(evaluator, new MeasurementType(), index);
                    else if(!(map instanceof MapValue)) return new TypeException(evaluator, new MapType(), map);
                    else {
                        if(index.greaterThan(this, map.size(this)).bool)
                            evaluator.jump(1);
                        // Otherwise, apply the given translator function to the current list value.
                        else {
                            const translator = evaluator.resolve("translator");
                            const mapKey = map.values[index.num.toNumber() - 1][0];
                            const mapValue = map.values[index.num.toNumber() - 1][1];
                            if(translator instanceof FunctionValue && 
                                translator.definition.expression instanceof Expression && 
                                translator.definition.inputs[0] instanceof Bind &&
                                translator.definition.inputs[1] instanceof Bind) {
                                const bindings = new Map<Names, Value>();
                                // Bind the map key and value
                                bindings.set(translator.definition.inputs[0].names, mapKey);
                                bindings.set(translator.definition.inputs[1].names, mapValue);
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
                }
            ),
            // Save the translated value and then jump to the conditional.
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Add the new value to the new map."
                },
                evaluator => {

                    // Get the translated value.
                    const translatedValue = evaluator.popValue(undefined);

                    // Get the index
                    const index = evaluator.resolve(INDEX);
                    if(!(index instanceof Measurement))
                        return new TypeException(evaluator, new MeasurementType(), index);
                    
                    const map = evaluator.getEvaluationContext()?.getContext();
                    if(!(map instanceof MapValue))
                        return new TypeException(evaluator, new MapType(), map);

                    // Append the translated value to the list.
                    const translatedMap = evaluator.resolve(MAP);
                    if(translatedMap instanceof MapValue)
                        evaluator.bind(MAP, translatedMap.set(this, map.values[index.num.toNumber() - 1][0], translatedValue));
                    else return new TypeException(evaluator, new MapType(), translatedMap);

                    // Increment the counter
                    evaluator.bind(INDEX, index.add(this, new Measurement(this, 1)));

                    // Jump to the conditional
                    evaluator.jump(-2);

                    return undefined;
                }
            ),
            new Finish(this)
        ];
    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Translate each value in the map, making a new map."
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to the new map!"
        }
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        // Evaluate to the new list.
        return evaluator.resolve("map");
    }

}