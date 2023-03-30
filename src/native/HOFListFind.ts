import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import type FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import MeasurementType from '@nodes/MeasurementType';
import type Type from '@nodes/Type';
import Bool from '@runtime/Bool';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import FunctionValue from '@runtime/FunctionValue';
import List from '@runtime/List';
import Measurement from '@runtime/Measurement';
import None from '@runtime/None';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import type Value from '@runtime/Value';
import HOF from './HOF';
import Names from '@nodes/Names';
import Initialize from '@runtime/Initialize';
import Next from '@runtime/Next';
import Check from '@runtime/Check';
import type Context from '@nodes/Context';

const INDEX = Names.make(['index']);

export default class HOFListFind extends HOF {
    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();
        this.hofType = hofType;
    }

    computeType(context: Context): Type {
        return ListType.make(
            context.native.getListDefinition().getTypeVariableReference(0)
        );
    }

    compile(): Step[] {
        return [
            new Start(this),
            // Initialize an iterator and an empty list in this scope.
            new Initialize(this, (evaluator) => {
                evaluator.bind(INDEX, new Measurement(this, 1));
                return undefined;
            }),
            new Next(this, (evaluator) => {
                const index = evaluator.resolve(INDEX);
                const list = evaluator.getCurrentEvaluation()?.getClosure();
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
                    // Otherwise, apply the given translator function to the current list value.
                    else {
                        const include = this.getInput(0, evaluator);
                        const listValue = list.get(index);
                        if (
                            include instanceof FunctionValue &&
                            include.definition.expression !== undefined &&
                            include.definition.inputs[0] instanceof Bind
                        ) {
                            const bindings = new Map<Names, Value>();
                            // Bind the list value
                            bindings.set(
                                include.definition.inputs[0].names,
                                listValue
                            );
                            // Apply the translator function to the value
                            evaluator.startEvaluation(
                                new Evaluation(
                                    evaluator,
                                    this,
                                    include.definition,
                                    include.context,
                                    bindings
                                )
                            );
                        } else
                            return evaluator.getValueOrTypeException(
                                this,
                                this.hofType,
                                include
                            );
                    }
                }
            }),
            // Save the translated value and then jump to the conditional.
            new Check(this, (evaluator) => {
                // Get the boolean from the function evaluation.
                const matched = evaluator.popValue(this, BooleanType.make());
                if (!(matched instanceof Bool)) return matched;

                // If this matches, skip the loop.
                if (matched.bool) return undefined;

                // Get the current index.
                const index = evaluator.resolve(INDEX);
                if (!(index instanceof Measurement))
                    return evaluator.getValueOrTypeException(
                        this,
                        MeasurementType.make(),
                        index
                    );

                // If it doesn't match, increment the counter and jump back to the conditional.
                evaluator.bind(
                    INDEX,
                    index.add(this, new Measurement(this, 1))
                );
                evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Get the current index.
        const index = evaluator.resolve(INDEX);
        if (!(index instanceof Measurement))
            return evaluator.getValueOrTypeException(
                this,
                MeasurementType.make(),
                index
            );

        // Get the list.
        const list = evaluator.getCurrentEvaluation()?.getClosure();
        if (!(list instanceof List))
            return evaluator.getValueOrTypeException(
                this,
                ListType.make(),
                list
            );

        // If we're past the end of the list, return nothing. Otherwise return the value at the index.
        return index.greaterThan(this, list.length(this)).bool
            ? new None(this)
            : list.get(index);
    }
}
