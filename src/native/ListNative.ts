import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import NumberType from '@nodes/NumberType';
import NameType from '@nodes/NameType';
import NoneType from '@nodes/NoneType';
import TextType from '@nodes/TextType';
import UnionType from '@nodes/UnionType';
import Value from '@runtime/Value';
import Bool from '@runtime/Bool';
import List from '@runtime/List';
import Text from '@runtime/Text';
import { createNativeConversion, createNativeFunction } from './Native';
import NativeExpression from './NativeExpression';
import HOFListAll from './HOFListAll';
import HOFListCombine from './HOFListCombine';
import NativeHOFListFilter from './HOFListFilter';
import HOFListFind from './HOFListFind';
import HOFListTranslate from './HOFListTranslate';
import NativeHOFListUntil from './HOFListUntil';
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

export default function bootstrapList(locales: Locale[]) {
    const ListTypeVarNames = getNameLocales(
        locales,
        (locale) => locale.native.List.kind
    );
    const ListTypeVariable = new TypeVariable(ListTypeVarNames);
    const DefaultListTypeVarName =
        ListTypeVarNames.names[0].getName() as string;

    function getListTypeVariableReference() {
        return new NameType(
            DefaultListTypeVarName,
            undefined,
            ListTypeVariable
        );
    }

    const translateTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.native.List.out)
    );

    const listTranslateHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.native.List.function.translate.value.doc
                ),
                getNameLocales(
                    locales,
                    (locale) =>
                        locale.native.List.function.translate.value.names
                ),
                // The type is a type variable, so we refer to it.
                new NameType(
                    DefaultListTypeVarName,
                    undefined,
                    ListTypeVariable
                )
            ),
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.native.List.function.translate.index.doc
                ),
                getNameLocales(
                    locales,
                    (locale) =>
                        locale.native.List.function.translate.index.names
                ),
                NumberType.make()
            ),
        ],
        translateTypeVariable.getReference()
    );

    const listFilterHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.native.List.function.filter.value.doc
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.native.List.function.filter.value.names
                ),
                getListTypeVariableReference()
            ),
        ],
        BooleanType.make()
    );

    const listAllHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.native.List.function.all.value.doc
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.native.List.function.all.value.names
                ),
                getListTypeVariableReference()
            ),
        ],
        BooleanType.make()
    );

    const listUntilHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.native.List.function.until.value.doc
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.native.List.function.until.value.names
                ),
                BooleanType.make()
            ),
        ],
        getListTypeVariableReference()
    );

    const listFindHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.native.List.function.find.value.doc
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.native.List.function.find.value.names
                ),
                BooleanType.make()
            ),
        ],
        getListTypeVariableReference()
    );

    const combineTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.native.List.out)
    );

    const listCombineHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) =>
                        locale.native.List.function.combine.combination.doc
                ),
                getNameLocales(
                    locales,
                    (locale) =>
                        locale.native.List.function.combine.combination.names
                ),
                combineTypeVariable.getReference()
            ),
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.native.List.function.combine.next.doc
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.native.List.function.combine.next.names
                ),
                getListTypeVariableReference()
            ),
            Bind.make(
                getDocLocales(
                    locales,
                    (locale) => locale.native.List.function.combine.index.doc
                ),
                getNameLocales(
                    locales,
                    (locale) => locale.native.List.function.combine.index.names
                ),
                NumberType.make()
            ),
        ],
        combineTypeVariable.getReference()
    );

    const addInputNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.add.inputs[0].names
    );

    const hasInputNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.has.inputs[0].names
    );

    const joinInputNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.join.inputs[0].names
    );

    const sansInputNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.sans.inputs[0].names
    );

    const sansAllInputNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.sansAll.inputs[0].names
    );

    const equalsInputNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.equals.inputs[0].names
    );

    const notequalsInputNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.notequals.inputs[0].names
    );

    const replaceIndexNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.replace.inputs[0].names
    );
    const replaceValueNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.replace.inputs[1].names
    );

    const subsequenceStartNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.subsequence.inputs[0].names
    );
    const subsequenceEndNames = getNameLocales(
        locales,
        (locale) => locale.native.List.function.subsequence.inputs[1].names
    );

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.native.List.doc),
        getNameLocales(locales, (locale) => locale.native.List.name),
        [],
        TypeVariables.make([ListTypeVariable]),
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.add.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.add.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.native.List.function.add.inputs[0]
                                        .doc
                            ),
                            addInputNames,
                            getListTypeVariableReference()
                        ),
                    ],
                    ListType.make(getListTypeVariableReference()),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.replace.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.replace.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.replace.inputs[0].doc
                            ),
                            replaceIndexNames,
                            NumberType.make()
                        ),
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.replace.inputs[1].doc
                            ),
                            replaceValueNames,
                            getListTypeVariableReference()
                        ),
                    ],
                    ListType.make(getListTypeVariableReference()),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.append.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.append.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.append.inputs[0].doc
                            ),
                            addInputNames,
                            ListType.make(getListTypeVariableReference())
                        ),
                    ],
                    ListType.make(getListTypeVariableReference()),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.length.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.length.names
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.random.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.random.names
                    ),
                    undefined,
                    [],
                    getListTypeVariableReference(),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.first.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.first.names
                    ),
                    undefined,
                    [],
                    UnionType.make(
                        getListTypeVariableReference(),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.has.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.has.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.native.List.function.has.inputs[0]
                                        .doc
                            ),
                            hasInputNames,
                            getListTypeVariableReference()
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.join.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.join.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.native.List.function.join.inputs[0]
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.subsequence.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) =>
                            locale.native.List.function.subsequence.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.subsequence.inputs[0]
                                        .doc
                            ),
                            subsequenceStartNames,
                            NumberType.make()
                        ),
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.subsequence.inputs[1]
                                        .doc
                            ),
                            subsequenceEndNames,
                            UnionType.make(NumberType.make(), NoneType.make()),
                            NoneLiteral.make()
                        ),
                    ],
                    getListTypeVariableReference(),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.last.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.last.names
                    ),
                    undefined,
                    [],
                    getListTypeVariableReference(),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.sansFirst.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.sansFirst.names
                    ),
                    undefined,
                    [],
                    ListType.make(getListTypeVariableReference()),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.sansLast.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.sansLast.names
                    ),
                    undefined,
                    [],
                    ListType.make(getListTypeVariableReference()),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.sans.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.sans.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.native.List.function.sans.inputs[0]
                                        .doc
                            ),
                            sansInputNames,
                            getListTypeVariableReference()
                        ),
                    ],
                    ListType.make(getListTypeVariableReference()),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.sansAll.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.sansAll.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.sansAll.inputs[0].doc
                            ),
                            sansAllInputNames,
                            getListTypeVariableReference()
                        ),
                    ],
                    ListType.make(getListTypeVariableReference()),
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
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.reverse.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.reverse.names
                    ),
                    undefined,
                    [],
                    ListType.make(getListTypeVariableReference()),
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
                        (locale) => locale.native.List.function.equals.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.equals.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.equals.inputs[0].doc
                            ),
                            equalsInputNames,
                            ListType.make()
                        ),
                    ],
                    new NativeExpression(
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
                        (locale) => locale.native.List.function.notequals.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.notequals.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.notequals.inputs[0]
                                        .doc
                            ),
                            notequalsInputNames,
                            ListType.make()
                        ),
                    ],
                    new NativeExpression(
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
                        (locale) => locale.native.List.function.translate.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.translate.names
                    ),
                    TypeVariables.make([translateTypeVariable]),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.translate.inputs[0]
                                        .doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.translate.inputs[0]
                                        .names
                            ),
                            listTranslateHOFType
                        ),
                    ],
                    new HOFListTranslate(listTranslateHOFType),
                    ListType.make(translateTypeVariable.getReference())
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.filter.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.filter.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.filter.inputs[0].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.filter.inputs[0]
                                        .names
                            ),
                            listFilterHOFType
                        ),
                    ],
                    new NativeHOFListFilter(listFilterHOFType),
                    ListType.make(getListTypeVariableReference())
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.all.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.all.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.native.List.function.all.inputs[0]
                                        .doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.all.inputs[0].names
                            ),
                            listAllHOFType
                        ),
                    ],
                    new HOFListAll(listAllHOFType),
                    BooleanType.make()
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.until.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.until.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.until.inputs[0].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.until.inputs[0].names
                            ),
                            listUntilHOFType
                        ),
                    ],
                    new NativeHOFListUntil(listUntilHOFType),
                    ListType.make(getListTypeVariableReference())
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.find.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.find.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (locale) =>
                                    locale.native.List.function.find.inputs[0]
                                        .doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.find.inputs[0].names
                            ),
                            listFindHOFType
                        ),
                    ],
                    new HOFListFind(listFindHOFType),
                    UnionType.make(
                        getListTypeVariableReference(),
                        NoneType.None
                    )
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.function.combine.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.native.List.function.combine.names
                    ),
                    TypeVariables.make([combineTypeVariable]),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.combine.inputs[0].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.combine.inputs[0]
                                        .names
                            )
                        ),
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.combine.inputs[1].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.List.function.combine.inputs[1]
                                        .names
                            ),
                            listCombineHOFType
                        ),
                    ],
                    new HOFListCombine(listCombineHOFType),
                    combineTypeVariable.getReference()
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.conversion.text
                    ),
                    '[]',
                    "''",
                    (requestor: Expression, val: List) =>
                        new Text(requestor, val.toString())
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.native.List.conversion.set
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
