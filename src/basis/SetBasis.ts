import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import SetType from '@nodes/SetType';
import StructureDefinition from '@nodes/StructureDefinition';
import List from '@runtime/List';
import Text from '@runtime/Text';
import Set from '@runtime/Set';
import { createBasisConversion, createBasisFunction } from './Basis';
import Bool from '@runtime/Bool';
import type Value from '@runtime/Value';
import type Evaluation from '@runtime/Evaluation';
import TypeVariables from '@nodes/TypeVariables';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import TypeVariable from '@nodes/TypeVariable';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';
import { createBind } from '../locale/Locale';
import { Iteration } from './Iteration';

export default function bootstrapSet(locales: Locale[]) {
    const SetTypeVariableNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.kind
    );
    const SetTypeVariable = new TypeVariable(SetTypeVariableNames);

    const setFilterHOFType = FunctionType.make(
        undefined,
        [
            createBind(
                locales,
                (locale) => locale.basis.Set.function.filter.value,
                SetTypeVariable.getReference()
            ),
        ],
        BooleanType.make()
    );

    const equalsFunctionNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.function.equals.inputs[0].names
    );

    const notEqualFunctionNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.function.notequals.inputs[0].names
    );

    const addFunctionNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.function.add.inputs[0].names
    );

    const removeFunctionNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.function.remove.inputs[0].names
    );

    const unionFunctionNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.function.union.inputs[0].names
    );

    const intersectionFunctionNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.function.intersection.inputs[0].names
    );

    const differenceFunctionNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.function.difference.inputs[0].names
    );

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Set.doc),
        getNameLocales(locales, (locale) => locale.basis.Set.name),
        // No interfaces
        [],
        // One type variable
        TypeVariables.make([SetTypeVariable]),
        // No inputs
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.function.equals.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Set.function.equals.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.basis.Set.function.equals.inputs[0].doc
                            ),
                            equalsFunctionNames,
                            SetType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const set = evaluation?.getClosure();
                        const other = evaluation.resolve(equalsFunctionNames);
                        return !(set instanceof Set && other instanceof Set)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  SetType.make(),
                                  other
                              )
                            : new Bool(requestor, set.isEqualTo(other));
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.function.notequals.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Set.function.notequals.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.Set.function.notequals.inputs[0].doc
                            ),
                            notEqualFunctionNames,
                            SetType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const set = evaluation?.getClosure();
                        const other = evaluation.resolve(notEqualFunctionNames);
                        return !(set instanceof Set && other instanceof Set)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  SetType.make(),
                                  other
                              )
                            : new Bool(requestor, !set.isEqualTo(other));
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.function.add.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Set.function.add.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.basis.Set.function.add.inputs[0].doc
                            ),
                            addFunctionNames,
                            SetTypeVariable.getReference()
                        ),
                    ],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set = evaluation?.getClosure();
                        const element = evaluation.resolve(addFunctionNames);
                        if (set instanceof Set && element !== undefined)
                            return set.add(requestor, element);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.function.remove.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Set.function.remove.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.basis.Set.function.remove.inputs[0].doc
                            ),
                            removeFunctionNames,
                            SetTypeVariable.getReference()
                        ),
                    ],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set: Evaluation | Value | undefined =
                            evaluation.getClosure();
                        const element = evaluation.resolve(removeFunctionNames);
                        if (set instanceof Set && element !== undefined)
                            return set.remove(requestor, element);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.function.union.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Set.function.union.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.basis.Set.function.union.inputs[0]
                                        .doc
                            ),
                            unionFunctionNames,
                            SetType.make(SetTypeVariable.getReference())
                        ),
                    ],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set: Evaluation | Value | undefined =
                            evaluation.getClosure();
                        const newSet = evaluation.resolve(unionFunctionNames);
                        if (set instanceof Set && newSet instanceof Set)
                            return set.union(requestor, newSet);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.function.intersection.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Set.function.intersection.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.Set.function.intersection.inputs[0]
                                        .doc
                            ),
                            intersectionFunctionNames
                        ),
                    ],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set = evaluation.getClosure();
                        const newSet = evaluation.resolve(
                            intersectionFunctionNames
                        );
                        if (set instanceof Set && newSet instanceof Set)
                            return set.intersection(requestor, newSet);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.function.difference.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Set.function.difference.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.Set.function.difference.inputs[0]
                                        .doc
                            ),
                            differenceFunctionNames
                        ),
                    ],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set = evaluation.getClosure();
                        const newSet = evaluation.resolve(
                            differenceFunctionNames
                        );
                        if (set instanceof Set && newSet instanceof Set)
                            return set.difference(requestor, newSet);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.function.filter.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Set.function.filter.names
                    ),
                    undefined,
                    [
                        createBind(
                            locales,
                            (t) => t.basis.Set.function.filter.inputs[0],
                            setFilterHOFType
                        ),
                    ],
                    new Iteration<{
                        index: number;
                        set: Set;
                        filtered: Value[];
                    }>(
                        SetType.make(SetTypeVariable.getReference()),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator) => {
                            return {
                                index: 0,
                                set: evaluator.getCurrentClosure() as Set,
                                filtered: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index >= info.set.values.length
                                ? false
                                : expr.evaluateFunctionInput(
                                      evaluator,
                                      0,
                                      setFilterHOFType,
                                      [info.set.values[info.index]]
                                  ),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const include = evaluator.popValue(expression);
                            if (!(include instanceof Bool))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    include
                                );
                            if (include.bool)
                                info.filtered.push(info.set.values[info.index]);
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new Set(expression, info.filtered)
                    ),
                    SetType.make(SetTypeVariable.getReference())
                ),

                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.conversion.text
                    ),
                    '{}',
                    "''",
                    (requestor: Expression, val: Set) =>
                        new Text(requestor, val.toString())
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.conversion.list
                    ),
                    '{}',
                    '[]',
                    (requestor: Expression, val: Set) =>
                        new List(requestor, val.values)
                ),
            ],
            BlockKind.Structure
        )
    );
}
