import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import type FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import MeasurementType from '@nodes/MeasurementType';
import Bool from '@runtime/Bool';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import FunctionValue from '@runtime/FunctionValue';
import List from '@runtime/List';
import Measurement from '@runtime/Measurement';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import TypeException from '@runtime/TypeException';
import type Value from '@runtime/Value';
import HOF from './HOF';
import Names from '@nodes/Names';
import Initialize from '@runtime/Initialize';
import Next from '@runtime/Next';
import Check from '@runtime/Check';

const INDEX = Names.make(['index']);

export default class HOFListAll extends HOF {
    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();
        this.hofType = hofType;
    }

    computeType() {
        return BooleanType.make();
    }

    compile(): Step[] {
        return [
            new Start(this),
            new Initialize(this, (evaluator) => {
                evaluator.bind(INDEX, new Measurement(this, 1));
                return undefined;
            }),
            new Next(this, (evaluator) => {
                const evaluation = evaluator.getCurrentEvaluation();
                const index = evaluator.resolve(INDEX);
                const list = evaluation?.getClosure();
                // If the index is past the last index of the list, jump to the end.
                if (!(index instanceof Measurement))
                    return evaluator.getValueOrTypeException(
                        this,
                        MeasurementType.make(),
                        index
                    );
                else if (!(list instanceof List))
                    return evaluator.getValueOrTypeException(
                        this,
                        ListType.make(),
                        list
                    );
                else {
                    if (index.greaterThan(this, list.length(this)).bool)
                        evaluator.jump(1);
                    // Otherwise, apply the given matcher function to the current list value.
                    else {
                        const checker = this.getInput(0, evaluator);
                        const listValue = list.get(index);
                        if (
                            checker instanceof FunctionValue &&
                            checker.definition.expression !== undefined &&
                            checker.definition.inputs[0] instanceof Bind
                        ) {
                            const bindings = new Map<Names, Value>();
                            // Bind the list value
                            bindings.set(
                                checker.definition.inputs[0].names,
                                listValue
                            );
                            // Apply the translator function to the value
                            evaluator.startEvaluation(
                                new Evaluation(
                                    evaluator,
                                    this,
                                    checker.definition,
                                    checker.context,
                                    bindings
                                )
                            );
                        } else
                            return evaluator.getValueOrTypeException(
                                this,
                                this.hofType,
                                checker
                            );
                    }
                }
                return undefined;
            }),
            // Save the translated value and then jump to the conditional.
            new Check(this, (evaluator) => {
                // Get the bool from the matcher
                const matched = evaluator.popValue(this, BooleanType.make());
                if (!(matched instanceof Bool)) return matched;

                // Get the current index
                const index = evaluator.resolve(INDEX);
                if (!(index instanceof Measurement))
                    return new TypeException(
                        this,
                        evaluator,
                        MeasurementType.make(),
                        matched
                    );

                // If it matched, increment and jump to the conditional.
                if (matched.bool) {
                    evaluator.bind(
                        INDEX,
                        index.add(this, new Measurement(this, 1))
                    );
                    evaluator.jump(-2);
                }
                // Otherwise, go to the last step and fail.

                return undefined;
            }),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Get the index and list.
        const index = evaluator.resolve(INDEX);
        if (!(index instanceof Measurement))
            return evaluator.getValueOrTypeException(
                this,
                MeasurementType.make(),
                index
            );
        const list = evaluator.getCurrentEvaluation()?.getClosure();
        if (!(list instanceof List))
            return evaluator.getValueOrTypeException(
                this,
                ListType.make(),
                index
            );

        // Evaluate to true if we made it past the length of the list, false otherwise.
        return index.greaterThan(this, list.length(this));
    }
}
