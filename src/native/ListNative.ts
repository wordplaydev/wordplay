import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import BooleanType from "../nodes/BooleanType";
import FunctionDefinition from "../nodes/FunctionDefinition";
import FunctionType from "../nodes/FunctionType";
import ListType from "../nodes/ListType";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import NoneType from "../nodes/NoneType";
import TextType from "../nodes/TextType";
import UnionType from "../nodes/UnionType";
import Value from "../runtime/Value";
import Bool from "../runtime/Bool";
import List from "../runtime/List";
import Text from "../runtime/Text";
import TypeException from "../runtime/TypeException";
import { createNativeConversion, createNativeFunction } from "./NativeBindings";
import { LIST_TYPE_VAR_NAME } from "./NativeConstants";
import NativeExpression from "./NativeExpression";
import NativeHOFListAll from "./NativeHOFListAll";
import NativeHOFListCombine from "./NativeHOFListCombine";
import NativeHOFListFilter from "./NativeHOFListFilter";
import NativeHOFListFind from "./NativeHOFListFind";
import NativeHOFListTranslate from "./NativeHOFListTranslate";
import NativeHOFListUntil from "./NativeHOFListUntil";
import Set from "../runtime/Set";
import StructureDefinition from "../nodes/StructureDefinition";
import TypeVariable from "../nodes/TypeVariable";
import Block from "../nodes/Block";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";

export default function bootstrapList() {

    const LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME = "Out";

    const listTranslateHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new NameType(LIST_TYPE_VAR_NAME)
        )
    ], new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME));

    const listFilterHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS, 
            undefined, 
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new NameType(LIST_TYPE_VAR_NAME)
        )
    ], new BooleanType());

    const listAllHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new NameType(LIST_TYPE_VAR_NAME)
        )
    ], new BooleanType());


    const listUntilHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new BooleanType(),
        )
    ], new NameType(LIST_TYPE_VAR_NAME));


    const listFindHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new BooleanType()
        )
    ], new NameType(LIST_TYPE_VAR_NAME));


    const listCombineHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "combination",
                "😀": TRANSLATE
            },
            new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME)
        ),
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "next",
                "😀": TRANSLATE
            },
            new NameType(LIST_TYPE_VAR_NAME)
        )
    ], new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME));

    return new StructureDefinition(
        WRITE_DOCS,
        {
            eng: "list",
            "😀": TRANSLATE
        },
        [],
        [ new TypeVariable(LIST_TYPE_VAR_NAME)],
        [],
        // Include all of the functions defined above.
        new Block([], [
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "add",
                    "😀": "+"
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(LIST_TYPE_VAR_NAME)
                ) ],
                new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve('value');
                    if(list instanceof List && value !== undefined) return list.add(value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "length",
                    "😀": TRANSLATE
                }, 
                [], 
                [], 
                new MeasurementType(),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.length();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "random",
                    "😀": TRANSLATE
                }, 
                [], 
                [],
                new NameType(LIST_TYPE_VAR_NAME),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.random();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "first",
                    "😀": TRANSLATE
                }, 
                [], 
                [], 
                new NameType(LIST_TYPE_VAR_NAME),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.first();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "has",
                    "😀": TRANSLATE
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(LIST_TYPE_VAR_NAME)
                ) ], 
                new BooleanType(),
                evaluation => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.has(value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "join",
                    "😀": TRANSLATE
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "separator",
                        "😀": TRANSLATE
                    }, 
                    new TextType()
                ) ], 
                new TextType(),
                evaluation => {
                    const list = evaluation.getContext();
                    const separator = evaluation.resolve("separator");
                    if(list instanceof List && separator instanceof Text) return list.join(separator);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "last",
                    "😀": TRANSLATE
                }, 
                [], 
                [], 
                new NameType(LIST_TYPE_VAR_NAME),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.last();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "sansFirst",
                    "😀": TRANSLATE
                }, 
                [], 
                [], 
                new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.sansFirst();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "lastLast",
                    "😀": TRANSLATE
                }, 
                [], 
                [], 
                new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.sansLast();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "sans",
                    "😀": TRANSLATE
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(LIST_TYPE_VAR_NAME)
                ) ], 
                new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.sans(value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "sansAll",
                    "😀": TRANSLATE
                },
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(LIST_TYPE_VAR_NAME)
                ) ], 
                new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.sansAll(value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS,
                {
                    eng: "reverse",
                    "😀": TRANSLATE
                }, 
                [], 
                [], 
                new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.reverse();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "equals",
                    "😀": "="
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new ListType()
                ) ],
                new NativeExpression(new BooleanType(), 
                    evaluation => {
                        const list = evaluation.getContext();
                        const value = evaluation.resolve("value");
                        if(!(list instanceof List)) return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                        if(!(value instanceof Value)) return new TypeException(evaluation.getEvaluator(), new ListType(), value);
                        return new Bool(list.isEqualTo(value));
                    },
                    {
                        "😀": TRANSLATE,
                        eng: "Comparing list values."
                    }
                ),
                new BooleanType()
            ),
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "not-equal",
                    "😀": "≠"
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new ListType()
                ) ],
                new NativeExpression(new BooleanType(), 
                    evaluation => {
                        const list = evaluation.getContext();
                        const value = evaluation.resolve("value");
                        if(!(list instanceof List)) return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                        if(!(value instanceof Value)) return new TypeException(evaluation.getEvaluator(), new ListType(), value);
                        return new Bool(!list.isEqualTo(value));
                    },
                    {
                        "😀": TRANSLATE,
                        eng: "Comparing list values."
                    }
                ),
                new BooleanType()
            ),
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "translate",
                    "😀": TRANSLATE
                }, 
                [ new TypeVariable(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME)], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "translator",
                        "😀": TRANSLATE
                    }, 
                    listTranslateHOFType
                ) ],
                new NativeHOFListTranslate(listTranslateHOFType),
                new ListType(new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME))
            ),
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "filter",
                    "😀": TRANSLATE
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "include",
                        "😀": TRANSLATE
                    }, 
                    listFilterHOFType
                ) ],
                new NativeHOFListFilter(listFilterHOFType),
                new ListType(new NameType(LIST_TYPE_VAR_NAME))
            ),
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "all",
                    "😀": TRANSLATE
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "matcher",
                        "😀": TRANSLATE
                    }, 
                    listAllHOFType
                ) ],
                new NativeHOFListAll(listAllHOFType),
                new BooleanType()
            ),        
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "until",
                    "😀": TRANSLATE
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "checker",
                        "😀": TRANSLATE
                    }, 
                    listUntilHOFType
                )],
                new NativeHOFListUntil(listUntilHOFType),
                new ListType(new NameType(LIST_TYPE_VAR_NAME))
            ),
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "find",
                    "😀": TRANSLATE
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    undefined, 
                    {
                        eng: "checker",
                        "😀": TRANSLATE
                    }, 
                    listFindHOFType
                ) ],
                new NativeHOFListFind(listFindHOFType),
                new UnionType(new NameType(LIST_TYPE_VAR_NAME), new NoneType({ eng: "notfound", "😀": TRANSLATE }))
            ),
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "combine",
                    "😀": TRANSLATE
                }, 
                [], 
                [
                    new Bind(
                        WRITE_DOCS, 
                        undefined, 
                        {
                            eng: "initial",
                            "😀": TRANSLATE
                        }
                    ),
                    new Bind(
                        WRITE_DOCS, 
                        undefined, 
                        {
                            eng: "combiner",
                            "😀": TRANSLATE
                        },
                        listCombineHOFType
                    )],
                new NativeHOFListCombine(listCombineHOFType),
                new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME)
            ),
            createNativeConversion([],  "[]", "''", (val: List) => new Text(val.toString())),
            createNativeConversion([],  "[]", "{}", (val: List) => new Set(val.getValues()))        
        ], false, true)
    );
    
}