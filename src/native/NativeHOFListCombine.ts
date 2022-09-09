import type Conflict from "../conflicts/Conflict";
import Bind from "../nodes/Bind";
import Expression from "../nodes/Expression";
import ListType from "../nodes/ListType";
import NameType from "../nodes/NameType";
import type { ConflictContext } from "../nodes/Node";
import type Type from "../nodes/Type";
import Bool from "../runtime/Bool";
import Evaluation from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Finish from "../runtime/Finish";
import FunctionValue from "../runtime/FunctionValue";
import List from "../runtime/List";
import Measurement from "../runtime/Measurement";
import Action from "../runtime/Start";
import type Step from "../runtime/Step";
import type Value from "../runtime/Value";

export default class NativeHOFListCombine extends Expression {

    computeChildren() { return [] };
    getType(context: ConflictContext): Type { return new ListType(new NameType("V")); }

    compile(context: ConflictContext): Step[] { 
        return [
            // Initialize an iterator and the current combination.
            new Action(this, evaluator => {
                evaluator.bind("index", new Measurement(1));
                return undefined;
            }),
            new Action(this, evaluator => {
                // Get the index.
                const index = evaluator.resolve("index");
                if(!(index instanceof Measurement))
                    return new Exception(this, ExceptionKind.EXPECTED_TYPE);

                // Get the list we're processing.
                const list = evaluator.getEvaluationContext()?.getContext();
                if(!(list instanceof List))
                    return new Exception(this, ExceptionKind.EXPECTED_TYPE);

                // Get the list we're processing.
                const combination = evaluator.resolve("initial");
                if(combination === undefined)
                    return new Exception(this, ExceptionKind.EXPECTED_TYPE);

                // If we're past the end of the list, jump past the loop.
                if(index.greaterThan(list.length()).bool)
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
                            translator.definition, 
                            translator.definition.expression, 
                            translator.context, 
                            bindings
                        ));
                    }
                    else return new Exception(this, ExceptionKind.EXPECTED_TYPE)
                }
                return undefined;
            }),
            // Save the translated value and then jump to the conditional.
            new Action(this, evaluator => {

                // Update the combo.
                evaluator.bind("initial", evaluator.popValue());

                // Get the current index.
                const index = evaluator.resolve("index");
                if(!(index instanceof Measurement))
                    return new Exception(this, ExceptionKind.EXPECTED_TYPE);
                
                // Increment the index.
                evaluator.bind("index", index.add(new Measurement(1)));

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

}