import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import NumberType from '@nodes/NumberType';
import NoneType from '@nodes/NoneType';
import TextType from '@nodes/TextType';
import UnionType from '@nodes/UnionType';
import Value from '@runtime/Value';
import Bool from '@runtime/Bool';
import List from '@runtime/List';
import Text from '@runtime/Text';
import { createBasisConversion, createBasisFunction } from './Basis';
import BasisExpression from './BasisExpression';
import Set from '@runtime/Set';
import StructureDefinition from '@nodes/StructureDefinition';
import Block, { BlockKind } from '@nodes/Block';
import Number from '@runtime/Number';
import type Evaluation from '@runtime/Evaluation';
import TypeVariables from '@nodes/TypeVariables';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import TypeVariable from '@nodes/TypeVariable';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';
import NoneLiteral from '../nodes/NoneLiteral';
import None from '../runtime/None';
import { Iteration } from './Iteration';
import { createBind } from '../locale/Locale';
import ValueException from '../runtime/ValueException';

export default function bootstrapList(locales: Locale[]) {
    const ListTypeVarNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.kind
    );
    const ListTypeVariable = new TypeVariable(ListTypeVarNames);

    const TranslateTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.List.out)
    );

    const ListTranslateHOFType = FunctionType.make(
        undefined,
        [
            createBind(
                locales,
                (t) => t.basis.List.function.translate.value,
                // The type is a type variable, so we refer to it.
                ListTypeVariable.getReference()
            ),
            createBind(
                locales,
                (t) => t.basis.List.function.translate.index,
                NumberType.make()
            ),
        ],
        TranslateTypeVariable.getReference()
    );

    const listFilterHOFType = FunctionType.make(
        undefined,
        [
            createBind(
                locales,
                (locale) => locale.basis.List.function.filter.value,
                ListTypeVariable.getReference()
            ),
            createBind(
                locales,
                (locale) => locale.basis.List.function.filter.index,
                NumberType.make()
            ),
        ],
        BooleanType.make()
    );

    const listAllHOFType = FunctionType.make(
        undefined,
        [
            createBind(
                locales,
                (locale) => locale.basis.List.function.all.value,
                ListTypeVariable.getReference()
            ),
            createBind(
                locales,
                (locale) => locale.basis.List.function.all.index,
                NumberType.make()
            ),
        ],
        BooleanType.make()
    );

    const listUntilHOFType = FunctionType.make(
        undefined,
        [
            createBind(
                locales,
                (locale) => locale.basis.List.function.until.value,
                ListTypeVariable.getReference()
            ),
            createBind(
                locales,
                (locale) => locale.basis.List.function.until.index,
                NumberType.make()
            ),
        ],
        ListType.make(ListTypeVariable.getReference())
    );

    const listFindHOFType = FunctionType.make(
        undefined,
        [
            createBind(
                locales,
                (locale) => locale.basis.List.function.find.value,
                ListTypeVariable.getReference()
            ),
            createBind(
                locales,
                (locale) => locale.basis.List.function.find.index,
                NumberType.make()
            ),
        ],
        ListTypeVariable.getReference()
    );

    const combineTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.List.out)
    );

    const listCombineHOFType = FunctionType.make(
        undefined,
        [
            createBind(
                locales,
                (locale) => locale.basis.List.function.combine.combination,
                combineTypeVariable.getReference()
            ),
            createBind(
                locales,
                (locale) => locale.basis.List.function.combine.next,
                ListTypeVariable.getReference()
            ),
            createBind(
                locales,
                (locale) => locale.basis.List.function.combine.index,
                NumberType.make()
            ),
        ],
        combineTypeVariable.getReference()
    );

    const addInputNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.add.inputs[0].names
    );

    const hasInputNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.has.inputs[0].names
    );

    const joinInputNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.join.inputs[0].names
    );

    const sansInputNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.sans.inputs[0].names
    );

    const sansAllInputNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.sansAll.inputs[0].names
    );

    const equalsInputNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.equals.inputs[0].names
    );

    const notequalsInputNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.notequals.inputs[0].names
    );

    const replaceIndexNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.replace.inputs[0].names
    );
    const replaceValueNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.replace.inputs[1].names
    );

    const subsequenceStartNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.subsequence.inputs[0].names
    );
    const subsequenceEndNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.function.subsequence.inputs[1].names
    );

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.List.doc),
        getNameLocales(locales, (locale) => locale.basis.List.name),
        [],
        TypeVariables.make([ListTypeVariable]),
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.add.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.add.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.basis.List.function.add.inputs[0].doc
                            ),
                            addInputNames,
                            ListTypeVariable.getReference()
                        ),
                    ],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.resolve(addInputNames);
                        if (list instanceof List && value !== undefined)
                            return list.add(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.replace.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.replace.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.List.function.replace.inputs[0].doc
                            ),
                            replaceIndexNames,
                            NumberType.make()
                        ),
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.List.function.replace.inputs[1].doc
                            ),
                            replaceValueNames,
                            ListTypeVariable.getReference()
                        ),
                    ],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const index = evaluation.resolve(replaceIndexNames);
                        const value = evaluation.resolve(replaceValueNames);
                        if (
                            list instanceof List &&
                            index instanceof Number &&
                            value !== undefined
                        )
                            return list.replace(requestor, index, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.append.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.append.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.List.function.append.inputs[0].doc
                            ),
                            addInputNames,
                            ListType.make(ListTypeVariable.getReference())
                        ),
                    ],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.resolve(addInputNames);
                        if (!(list instanceof List))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                        else if (!(value instanceof List))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                value
                            );
                        else return list.append(requestor, value);
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.length.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.length.names
                    ),
                    undefined,
                    [],
                    NumberType.make(),
                    (requestor, evaluation) => {
                        const list: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        if (list instanceof List) return list.length(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.random.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.random.names
                    ),
                    undefined,
                    [],
                    ListTypeVariable.getReference(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof List) {
                            const random = evaluation
                                .getEvaluator()
                                .random.latest();
                            return list.get(
                                new Number(
                                    evaluation.getEvaluator().getMain(),
                                    Math.floor(
                                        random.toNumber() * list.values.length
                                    ) + 1
                                )
                            );
                        } else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.first.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.first.names
                    ),
                    undefined,
                    [],
                    UnionType.make(
                        ListTypeVariable.getReference(),
                        NoneType.None
                    ),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        if (list instanceof List) return list.first();
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.has.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.has.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.basis.List.function.has.inputs[0].doc
                            ),
                            hasInputNames,
                            ListTypeVariable.getReference()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const list: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        const value = evaluation.resolve(hasInputNames);
                        if (list instanceof List && value !== undefined)
                            return list.has(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.join.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.join.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.basis.List.function.join.inputs[0]
                                        .doc
                            ),
                            joinInputNames,
                            TextType.make()
                        ),
                    ],
                    TextType.make(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const separator = evaluation.resolve(joinInputNames);
                        if (list instanceof List && separator instanceof Text)
                            return list.join(requestor, separator);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.subsequence.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.subsequence.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.List.function.subsequence.inputs[0]
                                        .doc
                            ),
                            subsequenceStartNames,
                            NumberType.make()
                        ),
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.List.function.subsequence.inputs[1]
                                        .doc
                            ),
                            subsequenceEndNames,
                            UnionType.make(NumberType.make(), NoneType.make()),
                            NoneLiteral.make()
                        ),
                    ],
                    ListTypeVariable.getReference(),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        const start = evaluation.resolve(subsequenceStartNames);
                        const end = evaluation.resolve(subsequenceEndNames);
                        if (!(list instanceof List))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                        if (!(start instanceof Number))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                NumberType.make(),
                                list
                            );
                        if (!(end instanceof Number || end instanceof None))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                UnionType.make(
                                    NumberType.make(),
                                    NoneType.make()
                                ),
                                list
                            );
                        return list.subsequence(requestor, start, end);
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.last.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.last.names
                    ),
                    undefined,
                    [],
                    ListTypeVariable.getReference(),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        if (list instanceof List) return list.last();
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.sansFirst.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.sansFirst.names
                    ),
                    undefined,
                    [],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        if (list instanceof List)
                            return list.sansFirst(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.sansLast.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.sansLast.names
                    ),
                    undefined,
                    [],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof List)
                            return list.sansLast(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.sans.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.sans.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.basis.List.function.sans.inputs[0]
                                        .doc
                            ),
                            sansInputNames,
                            ListTypeVariable.getReference()
                        ),
                    ],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.resolve(sansInputNames);
                        if (list instanceof List && value !== undefined)
                            return list.sansAll(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.sansAll.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.sansAll.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.List.function.sansAll.inputs[0].doc
                            ),
                            sansAllInputNames,
                            ListTypeVariable.getReference()
                        ),
                    ],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.resolve(sansAllInputNames);
                        if (list instanceof List && value !== undefined)
                            return list.sansAll(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.reverse.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.reverse.names
                    ),
                    undefined,
                    [],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof List)
                            return list.reverse(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.equals.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.equals.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.List.function.equals.inputs[0].doc
                            ),
                            equalsInputNames,
                            ListType.make()
                        ),
                    ],
                    new BasisExpression(
                        BooleanType.make(),
                        (requestor, evaluation) => {
                            const list = evaluation.getClosure();
                            const value = evaluation.resolve(equalsInputNames);
                            if (!(list instanceof List))
                                return evaluation.getValueOrTypeException(
                                    requestor,
                                    ListType.make(),
                                    list
                                );
                            if (!(value instanceof Value))
                                return evaluation.getValueOrTypeException(
                                    requestor,
                                    ListType.make(),
                                    value
                                );
                            return new Bool(requestor, list.isEqualTo(value));
                        }
                    ),
                    BooleanType.make()
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.notequals.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.notequals.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.List.function.notequals.inputs[0]
                                        .doc
                            ),
                            notequalsInputNames,
                            ListType.make()
                        ),
                    ],
                    new BasisExpression(
                        BooleanType.make(),
                        (requestor, evaluation) => {
                            const list = evaluation.getClosure();
                            const value =
                                evaluation.resolve(notequalsInputNames);
                            if (!(list instanceof List))
                                return evaluation.getValueOrTypeException(
                                    requestor,
                                    ListType.make(),
                                    list
                                );
                            if (!(value instanceof Value))
                                return evaluation.getValueOrTypeException(
                                    requestor,
                                    ListType.make(),
                                    value
                                );
                            return new Bool(requestor, !list.isEqualTo(value));
                        }
                    ),
                    BooleanType.make()
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.translate.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.translate.names
                    ),
                    TypeVariables.make([TranslateTypeVariable]),
                    [
                        createBind(
                            locales,
                            (t) => t.basis.List.function.translate.inputs[0],
                            ListTranslateHOFType
                        ),
                    ],
                    new Iteration<{
                        index: number;
                        list: List;
                        translated: Value[];
                    }>(
                        ListTranslateHOFType,
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                                translated: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(
                                      evaluator,
                                      0,
                                      ListTranslateHOFType,
                                      [
                                          info.list.get(info.index),
                                          new Number(expr, info.index),
                                      ]
                                  ),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            // Get the translated value.
                            info.translated.push(
                                evaluator.popValue(expression)
                            );
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new List(expression, info.translated)
                    ),
                    ListType.make(TranslateTypeVariable.getReference())
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.filter.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.filter.names
                    ),
                    undefined,
                    [
                        createBind(
                            locales,
                            (t) => t.basis.List.function.filter.inputs[0],
                            listFilterHOFType
                        ),
                    ],
                    new Iteration<{
                        index: number;
                        list: List;
                        filtered: Value[];
                    }>(
                        ListTranslateHOFType,
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                                filtered: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(
                                      evaluator,
                                      0,
                                      ListTranslateHOFType,
                                      [
                                          info.list.get(info.index),
                                          new Number(expr, info.index),
                                      ]
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
                                info.filtered.push(info.list.get(info.index));
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new List(expression, info.filtered)
                    ),
                    ListType.make(ListTypeVariable.getReference())
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.all.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.all.names
                    ),
                    undefined,
                    [
                        createBind(
                            locales,
                            (t) => t.basis.List.function.all.inputs[0],
                            listAllHOFType
                        ),
                    ],
                    new Iteration<{
                        index: number;
                        list: List;
                        matches: boolean;
                    }>(
                        BooleanType.make(),
                        // Start with an index of one, the list we're checking.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                                matches: true,
                            };
                        },
                        // If we're past the end, stop. Otherwise, check the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(
                                      evaluator,
                                      0,
                                      listAllHOFType,
                                      [
                                          info.list.get(info.index),
                                          new Number(expr, info.index),
                                      ]
                                  ),
                        // If the value doesn't match, return false. Otherwise, loop back.
                        (evaluator, info, expression) => {
                            const matches = evaluator.popValue(expression);
                            if (!(matches instanceof Bool))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    matches
                                );
                            if (!matches.bool) {
                                info.matches = false;
                                return false;
                            } else {
                                info.index = info.index + 1;
                                return undefined;
                            }
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new Bool(expression, info.matches)
                    ),
                    BooleanType.make()
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.until.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.until.names
                    ),
                    undefined,
                    [
                        createBind(
                            locales,
                            (t) => t.basis.List.function.until.inputs[0],
                            listUntilHOFType
                        ),
                    ],
                    new Iteration<{
                        index: number;
                        list: List;
                    }>(
                        ListType.make(ListTypeVariable.getReference()),
                        // Start with an index of one and the list we're truncating.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(
                                      evaluator,
                                      0,
                                      listUntilHOFType,
                                      [
                                          info.list.get(info.index),
                                          new Number(expr, info.index),
                                      ]
                                  ),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const matches = evaluator.popValue(expression);
                            if (!(matches instanceof Bool))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    matches
                                );
                            if (!matches.bool) return false;
                            else {
                                info.index = info.index + 1;
                                return undefined;
                            }
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            info.list.subsequence(expression, 1, info.index + 1)
                    ),
                    ListType.make(ListTypeVariable.getReference())
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.find.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.find.names
                    ),
                    undefined,
                    [
                        createBind(
                            locales,
                            (t) => t.basis.List.function.find.inputs[0],
                            listFindHOFType
                        ),
                    ],
                    new Iteration<{
                        index: number;
                        list: List;
                    }>(
                        ListTypeVariable.getReference(),
                        // Start with an index of one and the list we're searching.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(
                                      evaluator,
                                      0,
                                      listUntilHOFType,
                                      [
                                          info.list.get(info.index),
                                          new Number(expr, info.index),
                                      ]
                                  ),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const matches = evaluator.popValue(expression);
                            if (!(matches instanceof Bool))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    matches
                                );
                            if (matches.bool) return false;
                            else {
                                info.index = info.index + 1;
                                return undefined;
                            }
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            info.list.get(info.index)
                    ),
                    UnionType.make(
                        ListTypeVariable.getReference(),
                        NoneType.None
                    )
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.function.combine.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.List.function.combine.names
                    ),
                    TypeVariables.make([combineTypeVariable]),
                    [
                        createBind(
                            locales,
                            (t) => t.basis.List.function.combine.inputs[0]
                        ),
                        createBind(
                            locales,
                            (t) => t.basis.List.function.combine.inputs[1],
                            listCombineHOFType
                        ),
                    ],
                    new Iteration<{
                        index: number;
                        list: List;
                        combo: Value;
                    }>(
                        ListTypeVariable.getReference(),
                        // Start with an index of one and the list we're searching.
                        (evaluator, expression) => {
                            const initial = expression.getInput(0, evaluator);
                            if (initial === undefined)
                                return new ValueException(
                                    evaluator,
                                    expression
                                );
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                                combo: initial,
                            };
                        },
                        // If we're past the end, stop. Otherwise, create the new combo with the combiner.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(
                                      evaluator,
                                      1,
                                      listUntilHOFType,
                                      [
                                          info.combo,
                                          info.list.get(info.index),
                                          new Number(expr, info.index),
                                      ]
                                  ),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const combo = evaluator.popValue(expression);
                            info.combo = combo;
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) => info.combo
                    ),
                    // new HOFListCombine(listCombineHOFType),
                    combineTypeVariable.getReference()
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.conversion.text
                    ),
                    '[]',
                    "''",
                    (requestor: Expression, val: List) =>
                        new Text(requestor, val.toString())
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.conversion.set
                    ),
                    `[]`,
                    '{}',
                    (requestor: Expression, val: List) =>
                        new Set(requestor, val.getValues())
                ),
            ],
            BlockKind.Structure
        )
    );
}
