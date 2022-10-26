import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanType from "../nodes/BooleanType";
import FunctionDefinition from "../nodes/FunctionDefinition";
import FunctionType from "../nodes/FunctionType";
import MapType from "../nodes/MapType";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import TypeVariable from "../nodes/TypeVariable";
import List from "../runtime/List";
import Text from "../runtime/Text";
import Map from "../runtime/Map";
import Set from "../runtime/Set";
import TypeException from "../runtime/TypeException";
import { MAP_KEY_TYPE_VAR_NAME, MAP_VALUE_TYPE_VAR_NAME } from "./NativeConstants";
import NativeHOFMapFilter from "./NativeHOFMapFilter";
import NativeHOFMapTranslate from "./NativeHOFMapTranslate";
import { createNativeConversion, createNativeFunction } from "./NativeBindings";
import Bool from "../runtime/Bool";
import { TRANSLATE, WRITE, WRITE_DOCS } from "../nodes/Translations";

export default function bootstrapMap() {

    const MAP_HOF_OUTPUT_TYPE_VARIABLE_NAME = "Out";

    const mapFilterHOFType = new FunctionType([ 
        new Bind(
            {
                eng: WRITE,
                "😀": WRITE
            },
            undefined,
            {
                eng: "key",
                "😀": TRANSLATE
            }, 
            new NameType(MAP_KEY_TYPE_VAR_NAME)
        ),
        new Bind(
            {
                eng: WRITE,
                "😀": WRITE
            },
            undefined,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new NameType(MAP_VALUE_TYPE_VAR_NAME)
        )
    ], new BooleanType());

    const mapTranslateHOFType = new FunctionType([ 
        new Bind(
            {
                eng: WRITE,
                "😀": WRITE
            },
            undefined,
            {
                eng: "key",
                "😀": TRANSLATE
            }, 
            new NameType(MAP_KEY_TYPE_VAR_NAME)
        ),
        new Bind(
            {
                eng: WRITE,
                "😀": WRITE
            },
            undefined,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new NameType(MAP_VALUE_TYPE_VAR_NAME)
        )
    ], new NameType(MAP_HOF_OUTPUT_TYPE_VARIABLE_NAME));

    return new StructureDefinition(
        {
            eng: WRITE,
            "😀": WRITE
        },
        {
            eng: "structure",
            "😀": TRANSLATE
        },
        // No interfaces
        [],
        // One type variable
        [ new TypeVariable(MAP_KEY_TYPE_VAR_NAME), new TypeVariable(MAP_VALUE_TYPE_VAR_NAME)],
        // No inputs
        [],
        // Include all of the functions defined above.
        new Block([], [             
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: "equals",
                    "😀": "="
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "map",
                        "😀": TRANSLATE
                    },
                    new MapType()
                ) ], 
                new BooleanType(),
                evaluation => {
                        const map = evaluation?.getContext();
                        const other = evaluation.resolve("map");
                        return !(map instanceof Map && other instanceof Map) ? 
                            new TypeException(evaluation.getEvaluator(), new MapType(), other) :
                            new Bool(map.isEqualTo(other));
                    }
            ),
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "not-equal",
                    "😀": "≠"
                }, 
                [], 
                [ new Bind(
                    {
                        eng: WRITE,
                        "😀": WRITE
                    },
                    undefined, 
                    {
                        eng: "map",
                        "😀": TRANSLATE
                    }, 
                    new MapType() 
                ) ], 
                new BooleanType(),
                evaluation => {
                    const map = evaluation?.getContext();
                    const other = evaluation.resolve("map");
                    return !(map instanceof Map && other instanceof Map) ? 
                        new TypeException(evaluation.getEvaluator(), new MapType(), other) :
                        new Bool(!map.isEqualTo(other));
                }
            ),
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "set",
                    "😀": TRANSLATE
                },
                [], 
                [ 
                    new Bind(
                        {
                            eng: WRITE,
                            "😀": WRITE
                        }, 
                        undefined, 
                        {
                            eng: "key",
                            "😀": TRANSLATE
                        }, 
                        new NameType("K") 
                    ),
                    new Bind(
                        {
                            eng: WRITE,
                            "😀": WRITE
                        }, 
                        undefined, 
                        {
                            eng: "value",
                            "😀": TRANSLATE
                        }, 
                        new NameType("V") 
                    )
                ],
                new MapType(),
                evaluation => {
                    const map = evaluation.getContext();
                    const key = evaluation.resolve("key");
                    const value = evaluation.resolve("value");
                    if(map instanceof Map && key !== undefined && value !== undefined) return map.set(key, value);
                    else return new TypeException(evaluation.getEvaluator(), new MapType(), map);
                }
            ),        
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "unset",
                    "😀": TRANSLATE
                },
                [], 
                [ 
                    new Bind(
                        {
                            eng: WRITE,
                            "😀": WRITE
                        }, 
                        undefined, 
                        {
                            eng: "key",
                            "😀": WRITE
                        },
                        new NameType("K") 
                    )
                ],
                new MapType(),
                evaluation => {
                    const map = evaluation.getContext();
                    const key = evaluation.resolve("key");
                    if(map instanceof Map && key !== undefined) return map.unset(key);
                    else return new TypeException(evaluation.getEvaluator(), new MapType(), map);
                }
            ),
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: "remove",
                    "😀": WRITE
                },
                [], 
                [ 
                    new Bind(
                        {
                            eng: WRITE,
                            "😀": WRITE
                        }, 
                        undefined, 
                        {
                            eng: "value",
                            "😀": WRITE
                        },
                        new NameType("V") 
                    )
                ],
                new MapType(),
                evaluation => {
                    const map = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(map instanceof Map && value !== undefined) return map.remove(value);
                    else return new TypeException(evaluation.getEvaluator(), new MapType(), map);
                }
            ),
            new FunctionDefinition(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "filter",
                    "😀": WRITE
                },
                [], 
                [
                    new Bind(
                        {
                            eng: WRITE,
                            "😀": WRITE
                        },
                        undefined, 
                        {
                            eng: "checker",
                            "😀": WRITE
                        },
                        mapFilterHOFType
                    )
                ],
                new NativeHOFMapFilter(mapFilterHOFType),
                new MapType(new NameType(MAP_KEY_TYPE_VAR_NAME), new NameType(MAP_VALUE_TYPE_VAR_NAME))
            ),
            new FunctionDefinition(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "translate",
                    "😀": WRITE
                },
                [], 
                [
                    new Bind(
                        {
                            eng: WRITE,
                            "😀": WRITE
                        }, 
                        undefined, 
                        {
                            eng: "translator",
                            "😀": WRITE
                        }, 
                        mapTranslateHOFType
                    )
                ],
                new NativeHOFMapTranslate(mapTranslateHOFType),
                new MapType(new NameType(MAP_KEY_TYPE_VAR_NAME), new NameType(MAP_HOF_OUTPUT_TYPE_VARIABLE_NAME))
            ),
            createNativeConversion([], "{:}", "''", (val: Map) => new Text(val.toString())),
            createNativeConversion([], "{:}", "{}", (val: Map) => new Set(val.getKeys())),
            createNativeConversion([], "{:}", "[]", (val: Map) => new List(val.getValues()))
        ], false, true)
    );

}