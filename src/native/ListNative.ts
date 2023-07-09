import Bind from '@nodes/Bind';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import MeasurementType from '@nodes/MeasurementType';
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
import Measurement from '@runtime/Measurement';
import type Evaluation from '@runtime/Evaluation';
import TypeVariables from '@nodes/TypeVariables';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import TypeVariable from '@nodes/TypeVariable';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';

export default function bootstrapList(locales: Locale[]) {
    const ListTypeVarNames = getNameLocales(locales, (t) => t.native.list.kind);
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
        getNameLocales(locales, (t) => t.native.list.out)
    );

    const listTranslateHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (t) => t.native.list.function.translate.value.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.list.function.translate.value.names
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
                    (t) => t.native.list.function.translate.index.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.list.function.translate.index.names
                ),
                MeasurementType.make()
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
                    (t) => t.native.list.function.filter.value.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.list.function.filter.value.names
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
                    (t) => t.native.list.function.all.value.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.list.function.all.value.names
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
                    (t) => t.native.list.function.until.value.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.list.function.until.value.names
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
                    (t) => t.native.list.function.find.value.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.list.function.find.value.names
                ),
                BooleanType.make()
            ),
        ],
        getListTypeVariableReference()
    );

    const combineTypeVariable = new TypeVariable(
        getNameLocales(locales, (t) => t.native.list.out)
    );

    const listCombineHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (t) => t.native.list.function.combine.combination.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.list.function.combine.combination.names
                ),
                combineTypeVariable.getReference()
            ),
            Bind.make(
                getDocLocales(
                    locales,
                    (t) => t.native.list.function.combine.next.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.list.function.combine.next.names
                ),
                getListTypeVariableReference()
            ),
            Bind.make(
                getDocLocales(
                    locales,
                    (t) => t.native.list.function.combine.index.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.list.function.combine.index.names
                ),
                MeasurementType.make()
            ),
        ],
        combineTypeVariable.getReference()
    );

    const addInputNames = getNameLocales(
        locales,
        (t) => t.native.list.function.add.inputs[0].names
    );

    const hasInputNames = getNameLocales(
        locales,
        (t) => t.native.list.function.has.inputs[0].names
    );

    const joinInputNames = getNameLocales(
        locales,
        (t) => t.native.list.function.join.inputs[0].names
    );

    const sansInputNames = getNameLocales(
        locales,
        (t) => t.native.list.function.sans.inputs[0].names
    );

    const sansAllInputNames = getNameLocales(
        locales,
        (t) => t.native.list.function.sansAll.inputs[0].names
    );

    const equalsInputNames = getNameLocales(
        locales,
        (t) => t.native.list.function.equals.inputs[0].names
    );

    const notequalsInputNames = getNameLocales(
        locales,
        (t) => t.native.list.function.notequals.inputs[0].names
    );

    const replaceIndexNames = getNameLocales(
        locales,
        (t) => t.native.list.function.replace.inputs[0].names
    );
    const replaceValueNames = getNameLocales(
        locales,
        (t) => t.native.list.function.replace.inputs[1].names
    );

    return StructureDefinition.make(
        getDocLocales(locales, (t) => t.native.list.doc),
        getNameLocales(locales, (t) => t.native.list.name),
        [],
        TypeVariables.make([ListTypeVariable]),
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.list.function.add.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.add.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.list.function.add.inputs[0].doc
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
                        (t) => t.native.list.function.replace.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.replace.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.replace.inputs[0].doc
                            ),
                            replaceIndexNames,
                            MeasurementType.make()
                        ),
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.replace.inputs[1].doc
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
                            index instanceof Measurement &&
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
                        (t) => t.native.list.function.append.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.append.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.append.inputs[0].doc
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
                        (t) => t.native.list.function.length.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.length.name
                    ),
                    undefined,
                    [],
                    MeasurementType.make(),
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
                        (t) => t.native.list.function.random.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.random.name
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
                                new Measurement(
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
                        (t) => t.native.list.function.first.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.first.name
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
                        (t) => t.native.list.function.has.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.has.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.list.function.has.inputs[0].doc
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
                        (t) => t.native.list.function.join.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.join.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.list.function.join.inputs[0].doc
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
                        (t) => t.native.list.function.last.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.last.name
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
                        (t) => t.native.list.function.sansFirst.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.sansFirst.name
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
                        (t) => t.native.list.function.sansLast.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.sansLast.name
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
                        (t) => t.native.list.function.sans.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.sans.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.list.function.sans.inputs[0].doc
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
                        (t) => t.native.list.function.sansAll.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.sansAll.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.sansAll.inputs[0].doc
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
                        (t) => t.native.list.function.reverse.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.reverse.name
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
                        (t) => t.native.list.function.equals.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.equals.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.equals.inputs[0].doc
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
                        (t) => t.native.list.function.notequals.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.notequals.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.notequals.inputs[0]
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
                        (t) => t.native.list.function.translate.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.translate.name
                    ),
                    TypeVariables.make([translateTypeVariable]),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.translate.inputs[0]
                                        .doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.translate.inputs[0]
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
                        (t) => t.native.list.function.filter.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.filter.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.filter.inputs[0].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.filter.inputs[0]
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
                        (t) => t.native.list.function.all.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.all.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.list.function.all.inputs[0].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.all.inputs[0].names
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
                        (t) => t.native.list.function.until.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.until.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.until.inputs[0].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.until.inputs[0].names
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
                        (t) => t.native.list.function.find.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.find.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.list.function.find.inputs[0].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.find.inputs[0].names
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
                        (t) => t.native.list.function.combine.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.list.function.combine.name
                    ),
                    TypeVariables.make([combineTypeVariable]),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.combine.inputs[0].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.combine.inputs[0]
                                        .names
                            )
                        ),
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.combine.inputs[1].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.list.function.combine.inputs[1]
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
                        (t) => t.native.list.conversion.text
                    ),
                    '[]',
                    "''",
                    (requestor: Expression, val: List) =>
                        new Text(requestor, val.toString())
                ),
                createNativeConversion(
                    getDocLocales(locales, (t) => t.native.list.conversion.set),
                    '[]',
                    '{}',
                    (requestor: Expression, val: List) =>
                        new Set(requestor, val.getValues())
                ),
            ],
            BlockKind.Creator
        )
    );
}
