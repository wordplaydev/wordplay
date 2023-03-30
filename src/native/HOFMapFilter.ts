import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import type Context from '@nodes/Context';
import type FunctionType from '@nodes/FunctionType';
import MapType from '@nodes/MapType';
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
import MapValue from '@runtime/Map';
import Measurement from '@runtime/Measurement';
import Next from '@runtime/Next';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import type Value from '@runtime/Value';
import ValueException from '@runtime/ValueException';
import HOF from './HOF';

const INDEX = Names.make(['index']);
const MAP = Names.make(['map']);

export default class HOFMapFilter extends HOF {
    readonly hofType: FunctionType;
    constructor(hofType: FunctionType) {
        super();
        this.hofType = hofType;
    }

    computeType(context: Context): Type {
        return MapType.make(
            context.native.getMapDefinition().getTypeVariableReference(0),
            context.native.getMapDefinition().getTypeVariableReference(1)
        );
    }

    compile(): Step[] {
        return [
            new Start(this),
            // Initialize an iterator and an empty list in this scope.
            new Initialize(this, (evaluator) => {
                evaluator.bind(INDEX, new Measurement(this, 1));
                evaluator.bind(MAP, new MapValue(this, []));
                return undefined;
            }),
            new Next(this, (evaluator) => {
                const index = evaluator.resolve(INDEX);
                const map = evaluator.getCurrentEvaluation()?.getClosure();
                const checker = this.getInput(0, evaluator);
                // If the index is past the last index of the list, jump to the end.
                if (
                    index instanceof Measurement &&
                    map instanceof MapValue &&
                    checker instanceof FunctionValue &&
                    checker.definition.expression !== undefined &&
                    checker.definition.inputs[0] instanceof Bind &&
                    checker.definition.inputs[1] instanceof Bind
                ) {
                    if (index.greaterThan(this, map.size(this)).bool)
                        evaluator.jump(1);
                    // Otherwise, apply the given translator function to the current list value.
                    else {
                        const mapKey = map.values[index.num.toNumber() - 1][0];
                        const mapValue =
                            map.values[index.num.toNumber() - 1][1];
                        const bindings = new Map<Names, Value>();
                        // Bind the key
                        bindings.set(
                            checker.definition.inputs[0].names,
                            mapKey
                        );
                        bindings.set(
                            checker.definition.inputs[1].names,
                            mapValue
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
                    }
                } else
                    return new InternalException(
                        evaluator,
                        'map filter does not have valid index, map, or checker'
                    );
            }),
            // Save the translated value and then jump to the conditional.
            new Check(this, (evaluator) => {
                // Get the boolean from the function evaluation.
                const include = evaluator.popValue(this, BooleanType.make());
                if (!(include instanceof Bool)) return include;

                // Get the current index.
                const index = evaluator.resolve(INDEX);
                if (!(index instanceof Measurement))
                    return new InternalException(
                        evaluator,
                        'map filter problem'
                    );

                const map = evaluator.getCurrentEvaluation()?.getClosure();
                if (!(map instanceof MapValue))
                    return new InternalException(
                        evaluator,
                        'map filter problem'
                    );

                // If the include decided yes, append the value.
                const newMap = evaluator.resolve(MAP);
                if (!(include instanceof Bool))
                    return new InternalException(
                        evaluator,
                        'map filter problem'
                    );
                else if (!(newMap instanceof MapValue))
                    return new InternalException(
                        evaluator,
                        'map filter problem'
                    );
                if (newMap instanceof MapValue && include instanceof Bool) {
                    if (include.bool) {
                        const mapKey = map.values[index.num.toNumber() - 1][0];
                        const mapValue =
                            map.values[index.num.toNumber() - 1][1];
                        evaluator.bind(MAP, newMap.set(this, mapKey, mapValue));
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
        return evaluator.resolve(MAP) ?? new ValueException(evaluator, this);
    }
}
