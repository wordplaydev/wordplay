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
import { LIST_TYPE_VAR_NAMES } from "./NativeConstants";
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
import type Translations from "../nodes/Translations";
import type Node from "../nodes/Node";

export default function bootstrapList() {

    const LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME: Translations = {
        eng: "Out",
        "😀": TRANSLATE
    };

    const listTranslateHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new NameType(LIST_TYPE_VAR_NAMES.eng)
        )
    ], new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME.eng));

    const listFilterHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS, 
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new NameType(LIST_TYPE_VAR_NAMES.eng)
        )
    ], new BooleanType());

    const listAllHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new NameType(LIST_TYPE_VAR_NAMES.eng)
        )
    ], new BooleanType());


    const listUntilHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new BooleanType()
        )
    ], new NameType(LIST_TYPE_VAR_NAMES.eng));


    const listFindHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new BooleanType()
        )
    ], new NameType(LIST_TYPE_VAR_NAMES.eng));


    const listCombineHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "combination",
                "😀": TRANSLATE
            },
            new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME.eng)
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "next",
                "😀": TRANSLATE
            },
            new NameType(LIST_TYPE_VAR_NAMES.eng)
        )
    ], new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME.eng));

    return new StructureDefinition(
        WRITE_DOCS,
        {
            eng: "list",
            "😀": TRANSLATE
        },
        [],
        [ new TypeVariable(LIST_TYPE_VAR_NAMES)],
        [],
        // Include all of the functions defined above.
        new Block([
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "add",
                    "😀": "+"
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(LIST_TYPE_VAR_NAMES.eng)
                ) ],
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve('value');
                    if(list instanceof List && value !== undefined) return list.add(requestor, value);
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
                (requestor, evaluation) => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.length(requestor);
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
                new NameType(LIST_TYPE_VAR_NAMES.eng),
                (requestor, evaluation) => {
                    requestor;
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
                new NameType(LIST_TYPE_VAR_NAMES.eng),
                (requestor, evaluation) => {
                    requestor;
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
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(LIST_TYPE_VAR_NAMES.eng)
                ) ], 
                new BooleanType(),
                (requestor, evaluation) => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.has(requestor, value);
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
                    {
                        eng: "separator",
                        "😀": TRANSLATE
                    }, 
                    new TextType()
                ) ], 
                new TextType(),
                (requestor, evaluation) => {
                    const list = evaluation.getContext();
                    const separator = evaluation.resolve("separator");
                    if(list instanceof List && separator instanceof Text) return list.join(requestor, separator);
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
                new NameType(LIST_TYPE_VAR_NAMES.eng),
                (requestor, evaluation) => {
                    requestor;
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
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.sansFirst(requestor);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "sansLast",
                    "😀": TRANSLATE
                }, 
                [], 
                [], 
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.sansLast(requestor);
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
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(LIST_TYPE_VAR_NAMES.eng)
                ) ], 
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.sans(requestor, value);
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
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(LIST_TYPE_VAR_NAMES.eng)
                ) ], 
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.sansAll(requestor, value);
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
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.reverse(requestor);
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
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new ListType()
                ) ],
                new NativeExpression(new BooleanType(), 
                (requestor, evaluation) => {
                        const list = evaluation.getContext();
                        const value = evaluation.resolve("value");
                        if(!(list instanceof List)) return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                        if(!(value instanceof Value)) return new TypeException(evaluation.getEvaluator(), new ListType(), value);
                        return new Bool(requestor, list.isEqualTo(value));
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
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new ListType()
                ) ],
                new NativeExpression(new BooleanType(), 
                (requestor, evaluation) => {
                        const list = evaluation.getContext();
                        const value = evaluation.resolve("value");
                        if(!(list instanceof List)) return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                        if(!(value instanceof Value)) return new TypeException(evaluation.getEvaluator(), new ListType(), value);
                        return new Bool(requestor, !list.isEqualTo(value));
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
                    {
                        eng: "translator",
                        "😀": TRANSLATE
                    }, 
                    listTranslateHOFType
                ) ],
                new NativeHOFListTranslate(listTranslateHOFType),
                new ListType(new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME.eng))
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
                    {
                        eng: "include",
                        "😀": TRANSLATE
                    }, 
                    listFilterHOFType
                ) ],
                new NativeHOFListFilter(listFilterHOFType),
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng))
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
                    {
                        eng: "checker",
                        "😀": TRANSLATE
                    }, 
                    listUntilHOFType
                )],
                new NativeHOFListUntil(listUntilHOFType),
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng))
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
                    {
                        eng: "checker",
                        "😀": TRANSLATE
                    }, 
                    listFindHOFType
                ) ],
                new NativeHOFListFind(listFindHOFType),
                new UnionType(new NameType(LIST_TYPE_VAR_NAMES.eng), new NoneType())
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
                        {
                            eng: "initial",
                            "😀": TRANSLATE
                        }
                    ),
                    new Bind(
                        WRITE_DOCS, 
                        {
                            eng: "combiner",
                            "😀": TRANSLATE
                        },
                        listCombineHOFType
                    )],
                new NativeHOFListCombine(listCombineHOFType),
                new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME.eng)
            ),
            createNativeConversion(WRITE_DOCS,  "[]", "''", (requestor: Node, val: List) => new Text(requestor, val.toString())),
            createNativeConversion(WRITE_DOCS,  "[]", "{}", (requestor: Node, val: List) => new Set(requestor, val.getValues()))        
        ], false, true)
    );
    
}