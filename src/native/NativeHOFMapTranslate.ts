import type Conflict from "../conflicts/Conflict";
import Bind from "../nodes/Bind";
import Expression from "../nodes/Expression";
import ListType from "../nodes/ListType";
import NameType from "../nodes/NameType";
import type { ConflictContext } from "../nodes/Node";
import type Type from "../nodes/Type";
import Evaluation from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Finish from "../runtime/Finish";
import FunctionValue from "../runtime/FunctionValue";
import List from "../runtime/List";
import MapValue from "../runtime/MapValue";
import Measurement from "../runtime/Measurement";
import Action from "../runtime/Start";
import type Step from "../runtime/Step";
import type Value from "../runtime/Value";

export default class NativeHOFMapTranslate extends Expression {

    computeChildren() { return [] };
    getType(context: ConflictContext): Type { return new ListType(new NameType("T")); }

    compile(context: ConflictContext): Step[] { 
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
                        const translator = evaluator.resolve("translator");
                        const mapKey = map.values[index.num.toNumber() - 1][0];
                        const mapValue = map.values[index.num.toNumber() - 1][1];
                        if(translator instanceof FunctionValue && 
                            translator.definition.expression instanceof Expression && 
                            translator.definition.inputs[0] instanceof Bind &&
                            translator.definition.inputs[1] instanceof Bind) {
                            const bindings = new Map<string, Value>();
                            // Bind the map key and value
                            (translator.definition.inputs[0] as Bind).getNames().forEach(n =>  bindings.set(n, mapKey));
                            (translator.definition.inputs[1] as Bind).getNames().forEach(n =>  bindings.set(n, mapValue));
                            // Apply the translator function to the value
                            evaluator.startEvaluation(new Evaluation(
                                evaluator, 
                                translator.definition, 
                                translator.definition.expression, 
                                translator.context, 
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

                // Get the translated value.
                const translatedValue = evaluator.popValue();

                // Get the index
                const index = evaluator.resolve("index");
                if(!(index instanceof Measurement))
                    return new Exception(this, ExceptionKind.EXPECTED_TYPE);
                
                const map = evaluator.getEvaluationContext()?.getContext();
                if(!(map instanceof MapValue))
                    return new Exception(this, ExceptionKind.EXPECTED_TYPE);

                // Append the translated value to the list.
                const translatedMap = evaluator.resolve("map");
                if(translatedMap instanceof MapValue)
                    evaluator.bind("map", translatedMap.set(map.values[index.num.toNumber() - 1][0], translatedValue));
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
        // Evaluate to the new list.
        return evaluator.resolve("map");
    }

}