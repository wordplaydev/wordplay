import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import MapType from '@nodes/MapType';
import StructureDefinition from '@nodes/StructureDefinition';
import List from '@runtime/List';
import Text from '@runtime/Text';
import Map from '@runtime/Map';
import Set from '@runtime/Set';
import HOFMapFilter from './HOFMapFilter';
import HOFMapTranslate from './HOFMapTranslate';
import { createNativeConversion, createNativeFunction } from './Native';
import Bool from '@runtime/Bool';
import TypeVariables from '@nodes/TypeVariables';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import TypeVariable from '@nodes/TypeVariable';
import type Evaluation from '@runtime/Evaluation';
import type Value from '@runtime/Value';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';

export default function bootstrapMap(locales: Locale[]) {
    const KeyTypeVariableNames = getNameLocales(
        locales,
        (t) => t.native.Map.key
    );
    const KeyTypeVariable = new TypeVariable(KeyTypeVariableNames);
    const ValueTypeVariableNames = getNameLocales(
        locales,
        (t) => t.native.Map.value
    );
    const ValueTypeVariable = new TypeVariable(ValueTypeVariableNames);

    const mapFilterHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (t) => t.native.Map.function.filter.key.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.Map.function.filter.key.names
                ),
                KeyTypeVariable.getReference()
            ),
            Bind.make(
                getDocLocales(
                    locales,
                    (t) => t.native.Map.function.filter.value.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.Map.function.filter.value.names
                ),
                ValueTypeVariable.getReference()
            ),
        ],
        BooleanType.make()
    );

    const translateTypeVariable = new TypeVariable(
        getNameLocales(locales, (t) => t.native.Map.result)
    );

    const mapTranslateHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales(
                    locales,
                    (t) => t.native.Map.function.translate.key.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.Map.function.translate.key.names
                ),
                KeyTypeVariable.getReference()
            ),
            Bind.make(
                getDocLocales(
                    locales,
                    (t) => t.native.Map.function.translate.value.doc
                ),
                getNameLocales(
                    locales,
                    (t) => t.native.Map.function.translate.value.names
                ),
                ValueTypeVariable.getReference()
            ),
        ],
        translateTypeVariable.getReference()
    );

    const equalsFunctionValueNames = getNameLocales(
        locales,
        (t) => t.native.Map.function.equals.inputs[0].names
    );
    const notEqualsFunctionValueNames = getNameLocales(
        locales,
        (t) => t.native.Map.function.notequals.inputs[0].names
    );

    const setFunctionKeyNames = getNameLocales(
        locales,
        (t) => t.native.Map.function.set.inputs[0].names
    );

    const setFunctionValueNames = getNameLocales(
        locales,
        (t) => t.native.Map.function.set.inputs[1].names
    );

    const unsetFunctionKeyNames = getNameLocales(
        locales,
        (t) => t.native.Map.function.unset.inputs[0].names
    );

    const removeFunctionValueNames = getNameLocales(
        locales,
        (t) => t.native.Map.function.remove.inputs[0].names
    );

    return StructureDefinition.make(
        getDocLocales(locales, (t) => t.native.Map.doc),
        getNameLocales(locales, (t) => t.native.Map.name),
        // No interfaces
        [],
        // One type variable
        TypeVariables.make([KeyTypeVariable, ValueTypeVariable]),
        // No inputs
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.Map.function.equals.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.Map.function.equals.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.Map.function.equals.inputs[0].doc
                            ),
                            equalsFunctionValueNames,
                            MapType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation?.getClosure();
                        const other = evaluation.resolve(
                            equalsFunctionValueNames
                        );
                        return !(map instanceof Map && other instanceof Map)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  MapType.make(),
                                  other
                              )
                            : new Bool(requestor, map.isEqualTo(other));
                    }
                ),
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.Map.function.notequals.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.Map.function.notequals.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.Map.function.notequals.inputs[0]
                                        .doc
                            ),
                            notEqualsFunctionValueNames,
                            MapType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation?.getClosure();
                        const other = evaluation.resolve(
                            notEqualsFunctionValueNames
                        );
                        return !(map instanceof Map && other instanceof Map)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  MapType.make(),
                                  other
                              )
                            : new Bool(requestor, !map.isEqualTo(other));
                    }
                ),
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.Map.function.set.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.Map.function.set.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.Map.function.set.inputs[0].doc
                            ),
                            setFunctionKeyNames,
                            KeyTypeVariable.getReference()
                        ),
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.Map.function.set.inputs[1].doc
                            ),
                            setFunctionValueNames,
                            ValueTypeVariable.getReference()
                        ),
                    ],
                    MapType.make(),
                    (requestor, evaluation) => {
                        const map: Evaluation | Value | undefined =
                            evaluation.getClosure();
                        const key = evaluation.resolve(setFunctionKeyNames);
                        const value = evaluation.resolve(setFunctionValueNames);
                        if (
                            map instanceof Map &&
                            key !== undefined &&
                            value !== undefined
                        )
                            return map.set(requestor, key, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MapType.make(),
                                map
                            );
                    }
                ),
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.Map.function.unset.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.Map.function.unset.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) => t.native.Map.function.unset.inputs[0].doc
                            ),
                            unsetFunctionKeyNames,
                            KeyTypeVariable.getReference()
                        ),
                    ],
                    MapType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation.getClosure();
                        const key = evaluation.resolve(unsetFunctionKeyNames);
                        if (map instanceof Map && key !== undefined)
                            return map.unset(requestor, key);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MapType.make(),
                                map
                            );
                    }
                ),
                createNativeFunction(
                    getDocLocales(
                        locales,
                        (t) => t.native.Map.function.remove.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.Map.function.remove.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.Map.function.remove.inputs[0].doc
                            ),
                            removeFunctionValueNames,
                            ValueTypeVariable.getReference()
                        ),
                    ],
                    MapType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation.getClosure();
                        const value = evaluation.resolve(
                            removeFunctionValueNames
                        );
                        if (map instanceof Map && value !== undefined)
                            return map.remove(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MapType.make(),
                                map
                            );
                    }
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (t) => t.native.Map.function.filter.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.Map.function.filter.names
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.Map.function.filter.inputs[0].doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.Map.function.filter.inputs[0].names
                            ),
                            mapFilterHOFType
                        ),
                    ],
                    new HOFMapFilter(mapFilterHOFType),
                    MapType.make(
                        KeyTypeVariable.getReference(),
                        ValueTypeVariable.getReference()
                    )
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (t) => t.native.Map.function.translate.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.Map.function.translate.names
                    ),
                    TypeVariables.make([translateTypeVariable]),
                    [
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.native.Map.function.translate.inputs[0]
                                        .doc
                            ),
                            getNameLocales(
                                locales,
                                (t) =>
                                    t.native.Map.function.translate.inputs[0]
                                        .names
                            ),
                            mapTranslateHOFType
                        ),
                    ],
                    new HOFMapTranslate(mapTranslateHOFType),
                    MapType.make(
                        KeyTypeVariable.getReference(),
                        translateTypeVariable.getReference()
                    )
                ),
                createNativeConversion(
                    getDocLocales(locales, (t) => t.native.Map.conversion.text),
                    '{:}',
                    "''",
                    (requestor: Expression, val: Map) =>
                        new Text(requestor, val.toString())
                ),
                createNativeConversion(
                    getDocLocales(locales, (t) => t.native.Map.conversion.set),
                    '{:}',
                    '{}',
                    (requestor: Expression, val: Map) =>
                        new Set(requestor, val.getKeys())
                ),
                createNativeConversion(
                    getDocLocales(locales, (t) => t.native.Map.conversion.list),
                    '{:}',
                    '[]',
                    (requestor: Expression, val: Map) =>
                        new List(requestor, val.getValues())
                ),
            ],
            BlockKind.Structure
        )
    );
}
