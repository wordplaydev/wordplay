import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import type Context from '@nodes/Context';
import type FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import NumberType from '@nodes/NumberType';
import Names from '@nodes/Names';
import type Type from '@nodes/Type';
import Bool from '@runtime/Bool';
import Check from '@runtime/Check';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import FunctionValue from '@runtime/FunctionValue';
import Initialize from '@runtime/Initialize';
import List from '@runtime/List';
import Number from '@runtime/Number';
import Next from '@runtime/Next';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import type Value from '@runtime/Value';
import ValueException from '@runtime/ValueException';
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
            context.basis
                .getSimpleDefinition('list')
                .getTypeVariableReference(0)
        );
    }

    compile(): Step[] {
        return [
            new Start(this),
            // Initialize an iterator and an empty list in this scope.
            new Initialize(this, (evaluator) => {
                evaluator.bind(INDEX, new Number(this, 1));
                evaluator.bind(LIST, new List(this, []));
                return undefined;
            }),
            new Next(this, (evaluator) => {
                const index = evaluator.resolve(INDEX);
                const list = evaluator.getCurrentEvaluation()?.getClosure();
                // If the index is past the last index of the list, jump to the end.
                if (!(index instanceof Number))
                    return evaluator.getValueOrTypeException(
                        this,
                        NumberType.make(),
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
                const stop = evaluator.popValue(this, BooleanType.make());
                if (!(stop instanceof Bool)) return stop;

                // Get the current index.
                const index = evaluator.resolve(INDEX);
                if (!(index instanceof Number))
                    return evaluator.getValueOrTypeException(
                        this,
                        NumberType.make(),
                        index
                    );

                // Get the list.
                const list = evaluator.getCurrentEvaluation()?.getClosure();
                if (!(list instanceof List))
                    return evaluator.getValueOrTypeException(
                        this,
                        ListType.make(),
                        index
                    );

                const newList = evaluator.resolve(LIST);
                if (!(stop instanceof Bool))
                    return evaluator.getValueOrTypeException(
                        this,
                        BooleanType.make(),
                        stop
                    );
                else if (!(newList instanceof List))
                    return evaluator.getValueOrTypeException(
                        this,
                        ListType.make(),
                        newList
                    );
                else {
                    // If the include decided yes, append the value.
                    if (!stop.bool) {
                        const listValue = list.get(index);
                        evaluator.bind(LIST, newList.add(this, listValue));
                    }
                    // Otherwise, don't loop, just go to the end.
                    else {
                        return undefined;
                    }
                }

                // Increment the counter
                evaluator.bind(INDEX, index.add(this, new Number(this, 1)));

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
        return evaluator.resolve(LIST) ?? new ValueException(evaluator, this);
    }
}