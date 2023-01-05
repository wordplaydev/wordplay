import Bind from '../nodes/Bind';
import BooleanType from '../nodes/BooleanType';
import type Context from '../nodes/Context';
import Expression from '../nodes/Expression';
import type FunctionType from '../nodes/FunctionType';
import MapType from '../nodes/MapType';
import MeasurementType from '../nodes/MeasurementType';
import Names from '../nodes/Names';
import type Type from '../nodes/Type';
import Bool from '../runtime/Bool';
import Check from '../runtime/Check';
import Evaluation from '../runtime/Evaluation';
import type Evaluator from '../runtime/Evaluator';
import Finish from '../runtime/Finish';
import FunctionValue from '../runtime/FunctionValue';
import Initialize from '../runtime/Initialize';
import MapValue from '../runtime/Map';
import Measurement from '../runtime/Measurement';
import Next from '../runtime/Next';
import Start from '../runtime/Start';
import type Step from '../runtime/Step';
import TypeException from '../runtime/TypeException';
import type Value from '../runtime/Value';
import HOF from './HOF';

const INDEX = Names.make(['index']);
const MAP = Names.make(['map']);

export default class NativeHOFMapFilter extends HOF {
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
                // If the index is past the last index of the list, jump to the end.
                if (!(index instanceof Measurement))
                    return new TypeException(
                        evaluator,
                        MeasurementType.make(),
                        index
                    );
                else if (!(map instanceof MapValue))
                    return new TypeException(evaluator, MapType.make(), map);
                else {
                    if (index.greaterThan(this, map.size(this)).bool)
                        evaluator.jump(1);
                    // Otherwise, apply the given translator function to the current list value.
                    else {
                        const checker = this.getInput(0, evaluator);
                        const mapKey = map.values[index.num.toNumber() - 1][0];
                        const mapValue =
                            map.values[index.num.toNumber() - 1][1];
                        if (
                            checker instanceof FunctionValue &&
                            checker.definition.expression instanceof
                                Expression &&
                            checker.definition.inputs[0] instanceof Bind &&
                            checker.definition.inputs[1] instanceof Bind
                        ) {
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
                        } else
                            return new TypeException(
                                evaluator,
                                this.hofType,
                                checker
                            );
                    }
                }
            }),
            // Save the translated value and then jump to the conditional.
            new Check(this, (evaluator) => {
                // Get the boolean from the function evaluation.
                const include = evaluator.popValue(BooleanType.make());
                if (!(include instanceof Bool)) return include;

                // Get the current index.
                const index = evaluator.resolve(INDEX);
                if (!(index instanceof Measurement))
                    return new TypeException(
                        evaluator,
                        MeasurementType.make(),
                        index
                    );

                const map = evaluator.getCurrentEvaluation()?.getClosure();
                if (!(map instanceof MapValue))
                    return new TypeException(evaluator, MapType.make(), map);

                // If the include decided yes, append the value.
                const newMap = evaluator.resolve(MAP);
                if (!(include instanceof Bool))
                    return new TypeException(
                        evaluator,
                        BooleanType.make(),
                        include
                    );
                else if (!(newMap instanceof MapValue))
                    return new TypeException(evaluator, MapType.make(), newMap);
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
        return evaluator.resolve(MAP);
    }
}
