import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import type Context from '@nodes/Context';
import type FunctionType from '@nodes/FunctionType';
import MeasurementType from '@nodes/MeasurementType';
import Names from '@nodes/Names';
import NameType from '@nodes/NameType';
import SetType from '@nodes/SetType';
import type Type from '@nodes/Type';
import type TypeVariable from '@nodes/TypeVariable';
import Bool from '@runtime/Bool';
import Check from '@runtime/Check';
import Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import FunctionValue from '@runtime/FunctionValue';
import Initialize from '@runtime/Initialize';
import Measurement from '@runtime/Measurement';
import Next from '@runtime/Next';
import Set from '@runtime/Set';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import type Value from '@runtime/Value';
import ValueException from '@runtime/ValueException';
import HOF from './HOF';

const INDEX = Names.make(['index']);
const SET = Names.make(['set']);

export default class HOFSetFilter extends HOF {
    readonly hofType: FunctionType;

    constructor(hofType: FunctionType) {
        super();
        this.hofType = hofType;
    }

    computeType(context: Context): Type {
        // Get the type variable of set to make this, so we use whatever name it has.
        const typeVar = context.native.getPrimitiveDefinition('set').types
            ?.variables[0] as TypeVariable;
        return SetType.make(
            new NameType(typeVar.getNames()[0], undefined, typeVar)
        );
    }

    compile(): Step[] {
        return [
            new Start(this),
            // Initialize an iterator and an empty list in this scope.
            new Initialize(this, (evaluator) => {
                evaluator.bind(INDEX, new Measurement(this, 1));
                evaluator.bind(SET, new Set(this, []));
                return undefined;
            }),
            new Next(this, (evaluator) => {
                const index = evaluator.resolve(INDEX);
                const set = evaluator.getCurrentEvaluation()?.getClosure();
                // If the index is past the last index of the list, jump to the end.
                if (!(index instanceof Measurement))
                    return evaluator.getValueOrTypeException(
                        this,
                        MeasurementType.make(),
                        index
                    );
                else if (!(set instanceof Set))
                    return evaluator.getValueOrTypeException(
                        this,
                        SetType.make(),
                        set
                    );
                else {
                    if (index.greaterThan(this, set.size(this)).bool)
                        evaluator.jump(1);
                    // Otherwise, apply the given translator function to the current list value.
                    else {
                        const checker = this.getInput(0, evaluator);
                        const setValue = set.values[index.num.toNumber() - 1];
                        if (
                            checker instanceof FunctionValue &&
                            checker.definition.expression !== undefined &&
                            checker.definition.inputs[0] instanceof Bind
                        ) {
                            const bindings = new Map<Names, Value>();
                            // Bind the list value
                            bindings.set(
                                checker.definition.inputs[0].names,
                                setValue
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

                const set = evaluator.getCurrentEvaluation()?.getClosure();
                if (!(set instanceof Set))
                    return evaluator.getValueOrTypeException(
                        this,
                        SetType.make(),
                        set
                    );

                // If the include decided yes, append the value.
                const newSet = evaluator.resolve(SET);
                if (newSet instanceof Set) {
                    if (include.bool) {
                        const setValue = set.values[index.num.toNumber() - 1];
                        evaluator.bind(SET, newSet.add(this, setValue));
                    }
                } else
                    return evaluator.getValueOrTypeException(
                        this,
                        SetType.make(),
                        newSet
                    );

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
        return evaluator.resolve(SET) ?? new ValueException(evaluator, this);
    }
}
