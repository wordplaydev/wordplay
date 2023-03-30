import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import type Context from '@nodes/Context';
import type FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import MeasurementType from '@nodes/MeasurementType';
import Names from '@nodes/Names';
import type Type from '@nodes/Type';
import Bool from '@runtime/Bool';
import Check from '@runtime/Check';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import FunctionValue from '@runtime/FunctionValue';
import Initialize from '@runtime/Initialize';
import InternalException from '@runtime/InternalException';
import List from '@runtime/List';
import Measurement from '@runtime/Measurement';
import Next from '@runtime/Next';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import TypeException from '@runtime/TypeException';
import type Value from '@runtime/Value';
import HOF from './HOF';

const INDEX = Names.make(['index']);
const LIST = Names.make(['list']);

export default class HOFListMap extends HOF {
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
                            return new TypeException(
                                evaluator,
                                this.hofType,
                                index
                            );
                    }
                }
            }),
            // Save the translated value and then jump to the conditional.
            new Check(this, (evaluator) => {
                // Get the boolean from the function evaluation.
                const include = evaluator.popValue(this, BooleanType.make());
                if (!(include instanceof Bool)) return include;

                // Get the current index.
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
                        list
                    );

                // If the include decided yes, append the value.
                const newList = evaluator.resolve(LIST);
                if (!(newList instanceof List))
                    return evaluator.getValueOrTypeException(
                        this,
                        ListType.make(),
                        newList
                    );
                else if (!(include instanceof Bool))
                    return evaluator.getValueOrTypeException(
                        this,
                        BooleanType.make(),
                        include
                    );
                else {
                    if (include.bool) {
                        const listValue = list.get(index);
                        evaluator.bind(LIST, newList.add(this, listValue));
                    }
                }

                // Increment the counter
                evaluator.bind(
                    INDEX,
                    index.add(this, new Measurement(this, 1))
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

        // Evaluate to the filtered list.
        return (
            evaluator.resolve(LIST) ??
            new InternalException(evaluator, 'there should be a list to return')
        );
    }
}
