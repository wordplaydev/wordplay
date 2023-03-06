import Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import type FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import MeasurementType from '@nodes/MeasurementType';
import Names from '@nodes/Names';
import type Type from '@nodes/Type';
import Check from '@runtime/Check';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import FunctionValue from '@runtime/FunctionValue';
import Initialize from '@runtime/Initialize';
import List from '@runtime/List';
import Measurement from '@runtime/Measurement';
import Next from '@runtime/Next';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import type Value from '@runtime/Value';
import ValueException from '@runtime/ValueException';
import HOF from './HOF';

const INDEX = Names.make(['index']);
const LIST = Names.make(['list']);

export default class HOFListTranslate extends HOF {
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
                evaluator.bind(LIST, new List(this, []));
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
                        const translator = this.getInput(0, evaluator);
                        const listValue = list.get(index);
                        if (
                            translator instanceof FunctionValue &&
                            translator.definition.expression instanceof
                                Expression &&
                            translator.definition.inputs[0] instanceof Bind
                        ) {
                            const bindings = new Map<Names, Value>();
                            // Bind the list value
                            bindings.set(
                                translator.definition.inputs[0].names,
                                listValue
                            );
                            // Bind the index, if the function given takes one.
                            if (translator.definition.inputs.length >= 2)
                                bindings.set(
                                    translator.definition.inputs[1].names,
                                    index
                                );
                            // Apply the translator function to the value
                            evaluator.startEvaluation(
                                new Evaluation(
                                    evaluator,
                                    this,
                                    translator.definition,
                                    translator.context,
                                    bindings
                                )
                            );
                        } else
                            return evaluator.getValueOrTypeException(
                                this,
                                this.hofType,
                                translator
                            );
                    }
                }
                return undefined;
            }),
            // Save the translated value and then jump to the conditional.
            new Check(this, (evaluator) => {
                // Get the translated value.
                const translatedValue = evaluator.popValue(this);

                // Append the translated value to the list.
                const list = evaluator.resolve(LIST);
                if (list instanceof List)
                    evaluator.bind(LIST, list.add(this, translatedValue));
                else
                    evaluator.getValueOrTypeException(
                        this,
                        ListType.make(),
                        list
                    );

                // Increment the counter
                const index = evaluator.resolve(INDEX);
                if (index instanceof Measurement)
                    evaluator.bind(
                        INDEX,
                        index.add(this, new Measurement(this, 1))
                    );
                else
                    return evaluator.getValueOrTypeException(
                        this,
                        MeasurementType.make(),
                        index
                    );

                // Jump to the conditional
                evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Evaluate to the new list.
        return evaluator.resolve(LIST) ?? new ValueException(evaluator, this);
    }
}
