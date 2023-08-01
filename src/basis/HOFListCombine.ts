import Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import NumberType from '@nodes/NumberType';
import Names from '@nodes/Names';
import type Type from '@nodes/Type';
import Check from '@runtime/Check';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import FunctionValue from '@runtime/FunctionValue';
import Initialize from '@runtime/Initialize';
import InternalException from '@runtime/InternalException';
import List from '@runtime/List';
import Number from '@runtime/Number';
import Next from '@runtime/Next';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import TypeException from '@runtime/TypeException';
import type Value from '@runtime/Value';
import ValueException from '@runtime/ValueException';
import HOF from './HOF';

const INDEX = Names.make(['index']);

export default class HOFListCombine extends HOF {
    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();
        this.hofType = hofType;
    }

    computeType(context: Context): Type {
        return ListType.make(
            context
                .getBasis()
                .getSimpleDefinition('list')
                .getTypeVariableReference(0)
        );
    }

    compile(): Step[] {
        return [
            new Start(this),
            // Initialize an iterator and the current combination.
            new Initialize(this, (evaluator) => {
                evaluator.bind(INDEX, new Number(this, 1));
                return undefined;
            }),
            new Next(this, (evaluator) => {
                // Get the index.
                const index = evaluator.resolve(INDEX);
                if (!(index instanceof Number))
                    return evaluator.getValueOrTypeException(
                        this,
                        NumberType.make(),
                        index
                    );

                // Get the list we're processing.
                const list = evaluator.getCurrentEvaluation()?.getClosure();
                if (!(list instanceof List))
                    return evaluator.getValueOrTypeException(
                        this,
                        ListType.make(),
                        list
                    );

                // Get the list we're processing.
                const combination = this.getInput(0, evaluator);
                if (combination === undefined)
                    return new InternalException(
                        this,
                        evaluator,
                        "list.combine() is missing it's list for some reason"
                    );

                // If we're past the end of the list, jump past the loop.
                if (index.greaterThan(this, list.length(this)).bool)
                    evaluator.jump(1);
                // Otherwise, apply the given translator function to the current list value.
                else {
                    const translator = this.getInput(1, evaluator);
                    const listValue = list.get(index);
                    if (
                        translator instanceof FunctionValue &&
                        translator.definition.expression !== undefined &&
                        translator.definition.inputs[0] instanceof Bind &&
                        translator.definition.inputs[1] instanceof Bind
                    ) {
                        const bindings = new Map<Names, Value>();
                        // Bind the current combo
                        bindings.set(
                            translator.definition.inputs[0].names,
                            combination
                        );
                        // Bind the list value
                        bindings.set(
                            translator.definition.inputs[1].names,
                            listValue
                        );
                        // Bind the index value
                        if (translator.definition.inputs.length >= 3)
                            bindings.set(
                                translator.definition.inputs[2].names,
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
                        return new TypeException(
                            this,
                            evaluator,
                            this.hofType,
                            list
                        );
                }
                return undefined;
            }),
            // Save the translated value and then jump to the conditional.
            new Check(this, (evaluator) => {
                const initialNames = (
                    this.getInputBinds(evaluator) as Bind[]
                )[0].names;

                // Update the combo.
                evaluator.bind(initialNames, evaluator.popValue(this));

                // Get the current index.
                const index = evaluator.resolve(INDEX);
                if (!(index instanceof Number))
                    return evaluator.getValueOrTypeException(
                        this,
                        NumberType.make(),
                        index
                    );

                // Increment the index.
                evaluator.bind(INDEX, index.add(this, new Number(this, 1)));

                // Jump back to the loop.
                evaluator.jump(-2);

                return undefined;
            }),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Return the combo.
        return (
            this.getInput(0, evaluator) ?? new ValueException(evaluator, this)
        );
    }
}
