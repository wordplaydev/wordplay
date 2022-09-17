import Bind from "../nodes/Bind";
import Expression from "../nodes/Expression";
import ListType from "../nodes/ListType";
import NameType from "../nodes/NameType";
import type Type from "../nodes/Type";
import Bool from "../runtime/Bool";
import Evaluation from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Finish from "../runtime/Finish";
import FunctionValue from "../runtime/FunctionValue";
import MapValue from "../runtime/MapValue";
import Measurement from "../runtime/Measurement";
import Action from "../runtime/Start";
import type Step from "../runtime/Step";
import type Value from "../runtime/Value";
import HOF from "./HOF";
import { LIST_TYPE_VAR_NAME } from "./NativeConstants";

export default class NativeHOFListMap extends HOF {

    computeChildren() { return [] };
    computeType(): Type { return new ListType(new NameType(LIST_TYPE_VAR_NAME)); }

    compile(): Step[] { 
        return [
            // Initialize an iterator and an empty list in this scope.
            new Action(this, evaluator => {
                evaluator.bind("index", new Measurement(1));
                evaluator.bind("map", new MapValue([]));
                return undefined;
            }),
            new Action(this, evaluator => {
                const index = evaluator.resolve("index");
                const map = evaluator.getEvaluationContext()?.getContext();
                // If the index is past the last index of the list, jump to the end.
                if(index instanceof Measurement && map instanceof MapValue) {
                    if(index.greaterThan(map.size()).bool)
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
                            const bindings = new Map<string, Value>();
                            // Bind the key
                            (checker.definition.inputs[0] as Bind).getNames().forEach(n =>  bindings.set(n, mapKey));
                            (checker.definition.inputs[1] as Bind).getNames().forEach(n =>  bindings.set(n, mapValue));
                            // Apply the translator function to the value
                            evaluator.startEvaluation(new Evaluation(
                                evaluator, 
                                checker.definition, 
                                checker.definition.expression, 
                                checker.context, 
                                bindings
                            ));
                        }
                        else return new Exception(this, ExceptionKind.EXPECTED_TYPE)
                    }
                }
                else return new Exception(this, ExceptionKind.EXPECTED_TYPE);
                return undefined;
            }),
            // Save the translated value and then jump to the conditional.
            new Action(this, evaluator => {

                // Get the boolean from the function evaluation.
                const include = evaluator.popValue();
                if(!(include instanceof Bool))
                    return new Exception(this, ExceptionKind.EXPECTED_TYPE);

                // Get the current index.
                const index = evaluator.resolve("index");
                if(!(index instanceof Measurement))
                    return new Exception(this, ExceptionKind.EXPECTED_TYPE);

                const map = evaluator.getEvaluationContext()?.getContext();
                if(!(map instanceof MapValue))
                    return new Exception(this, ExceptionKind.EXPECTED_TYPE);

                // If the include decided yes, append the value.
                const newSet = evaluator.resolve("map");
                if(newSet instanceof MapValue && include instanceof Bool) {
                    if(include.bool) {
                        const mapKey = map.values[index.num.toNumber() - 1][0];
                        const mapValue = map.values[index.num.toNumber() - 1][1];
                        evaluator.bind("map", newSet.set(mapKey, mapValue));
                    }
                }
                else return new Exception(this, ExceptionKind.EXPECTED_TYPE);

                // Increment the counter
                evaluator.bind("index", index.add(new Measurement(1)));

                // Jump to the conditional
                evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        // Evaluate to the filtered list.
        return evaluator.resolve("map");
    }

}