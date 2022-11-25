import Bind from "../nodes/Bind";
import BooleanType from "../nodes/BooleanType";
import Expression from "../nodes/Expression";
import type FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MapType from "../nodes/MapType";
import MeasurementType from "../nodes/MeasurementType";
import Name from "../nodes/Name";
import Names from "../nodes/Names";
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
import MapValue from "../runtime/Map";
import Measurement from "../runtime/Measurement";
import Start from "../runtime/Start";
import type Step from "../runtime/Step";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import { LIST_TYPE_VAR_NAMES } from "./NativeConstants";

const INDEX = new Names([ new Name("index")]);
const MAP = new Names([ new Name("map")]);

export default class NativeHOFMapFilter extends HOF {

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
                    eng: "Initialize an index and map"
                },
                evaluator => {
                    evaluator.bind(INDEX, new Measurement(this, 1));
                    evaluator.bind(MAP, new MapValue(this, []));
                    return undefined;
                }),
            new Action(this, 
                {
                    "😀": TRANSLATE,
                    eng: "Check the next map value."
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
                            const checker = evaluator.resolve("checker");
                            const mapKey = map.values[index.num.toNumber() - 1][0];
                            const mapValue = map.values[index.num.toNumber() - 1][1];
                            if(checker instanceof FunctionValue && 
                                checker.definition.expression instanceof Expression && 
                                checker.definition.inputs[0] instanceof Bind &&
                                checker.definition.inputs[1] instanceof Bind) {
                                const bindings = new Map<Names, Value>();
                                // Bind the key
                                bindings.set(checker.definition.inputs[0].names, mapKey);
                                bindings.set(checker.definition.inputs[1].names, mapValue);
                                // Apply the translator function to the value
                                evaluator.startEvaluation(new Evaluation(
                                    evaluator, 
                                    this,
                                    checker.definition, 
                                    checker.definition.expression, 
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
                    eng: "Include if it matched."
                },
                evaluator => {

                // Get the boolean from the function evaluation.
                const include = evaluator.popValue(new BooleanType());
                if(!(include instanceof Bool)) return include;

                // Get the current index.
                const index = evaluator.resolve(INDEX);
                if(!(index instanceof Measurement))
                    return new TypeException(evaluator, new MeasurementType(), index);

                const map = evaluator.getEvaluationContext()?.getContext();
                if(!(map instanceof MapValue))
                    return new TypeException(evaluator, new MapType(), map);

                // If the include decided yes, append the value.
                const newMap = evaluator.resolve(MAP);
                if(!(include instanceof Bool)) return new TypeException(evaluator, new BooleanType(), include);
                else if(!(newMap instanceof MapValue)) return new TypeException(evaluator, new MapType(), newMap);
                if(newMap instanceof MapValue && include instanceof Bool) {
                    if(include.bool) {
                        const mapKey = map.values[index.num.toNumber() - 1][0];
                        const mapValue = map.values[index.num.toNumber() - 1][1];
                        evaluator.bind(MAP, newMap.set(this, mapKey, mapValue));
                    }
                }

                // Increment the counter
                evaluator.bind(INDEX, index.add(this, new Measurement(this, 1)));

                // Jump to the conditional
                evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value | undefined  {
        
        if(prior) return prior;

        // Evaluate to the filtered list.
        return evaluator.resolve("map");
    }

    getStartExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Make a new map of matching values."
        }
    }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to the new map."
        }
    }

}