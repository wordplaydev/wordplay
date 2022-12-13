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
import { TRANSLATE, WRITE, WRITE_DOCS } from "../nodes/Translations";
import type Translations from "../nodes/Translations";
import type Node from "../nodes/Node";
import Measurement from "../runtime/Measurement";

export default function bootstrapList() {

    const LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME: Translations = {
        eng: "Out",
        "😀": `${TRANSLATE}Out`
    };

    const listTranslateHOFType = new FunctionType([], [ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "value",
                "😀": `${TRANSLATE}value`
            },
            new NameType(LIST_TYPE_VAR_NAMES.eng)
        )
    ], new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME.eng));

    const listFilterHOFType = new FunctionType([], [ 
        new Bind(
            WRITE_DOCS, 
            {
                eng: "value",
                "😀": `${TRANSLATE}value`
            },
            new NameType(LIST_TYPE_VAR_NAMES.eng)
        )
    ], new BooleanType());

    const listAllHOFType = new FunctionType([], [ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "value",
                "😀": `${TRANSLATE}value`
            },
            new NameType(LIST_TYPE_VAR_NAMES.eng)
        )
    ], new BooleanType());


    const listUntilHOFType = new FunctionType([], [ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "value",
                "😀": `${TRANSLATE}value`
            },
            new BooleanType()
        )
    ], new NameType(LIST_TYPE_VAR_NAMES.eng));


    const listFindHOFType = new FunctionType([], [ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "value",
                "😀": `${TRANSLATE}value`
            },
            new BooleanType()
        )
    ], new NameType(LIST_TYPE_VAR_NAMES.eng));


    const listCombineHOFType = new FunctionType([], [ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "combination",
                "😀": `${TRANSLATE}combination`
            },
            new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME.eng)
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "next",
                "😀": `${TRANSLATE}next`
            },
            new NameType(LIST_TYPE_VAR_NAMES.eng)
        )
    ], new NameType(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME.eng));

    return new StructureDefinition(
        WRITE_DOCS,
        {
            eng: "list",
            "😀": `${TRANSLATE}list`
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
                        "😀": `${TRANSLATE}1`
                    }, 
                    new NameType(LIST_TYPE_VAR_NAMES.eng)
                ) ],
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getClosure();
                    const value = evaluation.resolve('value');
                    if(list instanceof List && value !== undefined) return list.add(requestor, value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "length",
                    "😀": `${TRANSLATE}length`
                }, 
                [], 
                [], 
                new MeasurementType(),
                (requestor, evaluation) => {
                    const list = evaluation.getClosure();
                    if(list instanceof List) return list.length(requestor);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "random",
                    "😀": `${TRANSLATE}random`
                }, 
                [], 
                [],
                new NameType(LIST_TYPE_VAR_NAMES.eng),
                (_, evaluation) => {
                    const list = evaluation.getClosure();
                    if(list instanceof List) {
                        const random = evaluation.getEvaluator().project.streams.random.latest();
                        return list.get(new Measurement(evaluation.getEvaluator().getMain(), Math.floor(random.toNumber() * list.values.length) + 1))
                    }
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "first",
                    "😀": `${TRANSLATE}first`
                }, 
                [], 
                [], 
                new NameType(LIST_TYPE_VAR_NAMES.eng),
                (requestor, evaluation) => {
                    requestor;
                    const list = evaluation.getClosure();
                    if(list instanceof List) return list.first();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "has",
                    "😀": `${TRANSLATE}has`
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    {
                        eng: "value",
                        "😀": `${TRANSLATE}1`
                    }, 
                    new NameType(LIST_TYPE_VAR_NAMES.eng)
                ) ], 
                new BooleanType(),
                (requestor, evaluation) => {
                    const list = evaluation.getClosure();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.has(requestor, value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "join",
                    "😀": `${TRANSLATE}join`
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    {
                        eng: "separator",
                        "😀": `${TRANSLATE}1`
                    }, 
                    new TextType()
                ) ], 
                new TextType(),
                (requestor, evaluation) => {
                    const list = evaluation.getClosure();
                    const separator = evaluation.resolve("separator");
                    if(list instanceof List && separator instanceof Text) return list.join(requestor, separator);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "last",
                    "😀": `${TRANSLATE}last`
                }, 
                [], 
                [], 
                new NameType(LIST_TYPE_VAR_NAMES.eng),
                (requestor, evaluation) => {
                    requestor;
                    const list = evaluation.getClosure();
                    if(list instanceof List) return list.last();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "sansFirst",
                    "😀": `${TRANSLATE}sansFirst`
                }, 
                [], 
                [], 
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getClosure();
                    if(list instanceof List) return list.sansFirst(requestor);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "sansLast",
                    "😀": `${TRANSLATE}sansLast`
                }, 
                [], 
                [], 
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getClosure();
                    if(list instanceof List) return list.sansLast(requestor);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "sans",
                    "😀": `${TRANSLATE}sans`
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    {
                        eng: "value",
                        "😀": `${TRANSLATE}1`
                    }, 
                    new NameType(LIST_TYPE_VAR_NAMES.eng)
                ) ], 
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getClosure();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.sans(requestor, value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS, 
                {
                    eng: "sansAll",
                    "😀": `${TRANSLATE}sansAll`
                },
                [], 
                [ new Bind(
                    WRITE_DOCS,
                    {
                        eng: "value",
                        "😀": `${TRANSLATE}1`
                    }, 
                    new NameType(LIST_TYPE_VAR_NAMES.eng)
                ) ], 
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getClosure();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.sansAll(requestor, value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction(
                WRITE_DOCS,
                {
                    eng: "reverse",
                    "😀": `${TRANSLATE}reverse`
                }, 
                [], 
                [], 
                new ListType(new NameType(LIST_TYPE_VAR_NAMES.eng)),
                (requestor, evaluation) => {
                    const list = evaluation.getClosure();
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
                        "😀": `${TRANSLATE}1`
                    }, 
                    new ListType()
                ) ],
                new NativeExpression(new BooleanType(), 
                (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.resolve("value");
                        if(!(list instanceof List)) return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                        if(!(value instanceof Value)) return new TypeException(evaluation.getEvaluator(), new ListType(), value);
                        return new Bool(requestor, list.isEqualTo(value));
                    },
                    {
                        "😀": WRITE,
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
                        "😀": `${TRANSLATE}1`
                    }, 
                    new ListType()
                ) ],
                new NativeExpression(new BooleanType(), 
                (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.resolve("value");
                        if(!(list instanceof List)) return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                        if(!(value instanceof Value)) return new TypeException(evaluation.getEvaluator(), new ListType(), value);
                        return new Bool(requestor, !list.isEqualTo(value));
                    },
                    {
                        "😀": WRITE,
                        eng: "Comparing list values."
                    }
                ),
                new BooleanType()
            ),
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "translate",
                    "😀": `${TRANSLATE}translate`
                }, 
                [ new TypeVariable(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME)], 
                [ new Bind(
                    WRITE_DOCS, 
                    {
                        eng: "translator",
                        "😀": `${TRANSLATE}1`
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
                    "😀": `${TRANSLATE}filter`
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    {
                        eng: "include",
                        "😀": `${TRANSLATE}1`
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
                    "😀": `${TRANSLATE}all`
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    {
                        eng: "matcher",
                        "😀": `${TRANSLATE}1`
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
                    "😀": `${TRANSLATE}until`
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    {
                        eng: "checker",
                        "😀": `${TRANSLATE}1`
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
                    "😀": `${TRANSLATE}find`
                }, 
                [], 
                [ new Bind(
                    WRITE_DOCS, 
                    {
                        eng: "checker",
                        "😀": `${TRANSLATE}1`
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
                    "😀": `${TRANSLATE}combine`
                }, 
                [ new TypeVariable(LIST_HOF_OUTPUT_TYPE_VARIABLE_NAME) ], 
                [
                    new Bind(
                        WRITE_DOCS, 
                        {
                            eng: "initial",
                            "😀": `${TRANSLATE}1`
                        }
                    ),
                    new Bind(
                        WRITE_DOCS, 
                        {
                            eng: "combiner",
                            "😀": `${TRANSLATE}2`
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