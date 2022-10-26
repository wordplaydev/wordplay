import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanType from "../nodes/BooleanType";
import FunctionDefinition from "../nodes/FunctionDefinition";
import FunctionType from "../nodes/FunctionType";
import NameType from "../nodes/NameType";
import SetType from "../nodes/SetType";
import StructureDefinition from "../nodes/StructureDefinition";
import TypeVariable from "../nodes/TypeVariable";
import List from "../runtime/List";
import Text from "../runtime/Text";
import Set from "../runtime/Set";
import TypeException from "../runtime/TypeException";
import { createNativeConversion, createNativeFunction } from "./NativeBindings";
import { SET_TYPE_VAR_NAMES } from "./NativeConstants";
import NativeHOFSetFilter from "./NativeHOFSetFilter";
import Bool from "../runtime/Bool";
import { TRANSLATE, WRITE, WRITE_DOCS } from "../nodes/Translations";

export default function bootstrapSet() {

    const setFilterHOFType = new FunctionType([ 
        new Bind(
            WRITE_DOCS,
            {
                eng: "value",
                "😀": TRANSLATE
            },
            new BooleanType()
        )
    ], new NameType(SET_TYPE_VAR_NAMES.eng));
    
    return new StructureDefinition(
        {
            eng: WRITE,
            "😀": WRITE
        },
        {
            eng: "set",
            "😀": TRANSLATE
        },
        // No interfaces
        [],
        // One type variable
        [ new TypeVariable(SET_TYPE_VAR_NAMES)],
        // No inputs
        [],
        // Include all of the functions defined above.
        new Block([
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
                    {
                        eng: WRITE,
                        "😀": WRITE
                    }, 
                    {
                        eng: "set",
                        "😀": TRANSLATE
                    }, 
                    new SetType() 
                ) ], 
                new BooleanType(),
                evaluation => {
                        const set = evaluation?.getContext();
                        const other = evaluation.resolve("set");
                        return !(set instanceof Set && other instanceof Set) ? 
                            new TypeException(evaluation.getEvaluator(), new SetType(), other) :
                            new Bool(set.isEqualTo(other));
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
                    {
                        eng: "set",
                        "😀": TRANSLATE
                    }, 
                    new SetType() 
                ) ], 
                new BooleanType(),
                evaluation => {
                        const set = evaluation?.getContext();
                        const other = evaluation.resolve("set");
                        return !(set instanceof Set && other instanceof Set) ? 
                            new TypeException(evaluation.getEvaluator(), new SetType(), other) :
                            new Bool(!set.isEqualTo(other));
                    }
            ),
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "add",
                    "😀": "+"
                },
                [],
                [ new Bind(
                    {
                        eng: WRITE,
                        "😀": WRITE
                    }, 
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(SET_TYPE_VAR_NAMES.eng) 
                ) ], 
                new SetType(new NameType(SET_TYPE_VAR_NAMES.eng)),
                evaluation => {
                        const set = evaluation?.getContext();
                        const element = evaluation.resolve("value");
                        if(set instanceof Set && element !== undefined) return set.add(element);
                        else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                    }
            ),
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "remove",
                    "😀": "-"
                },
                [], 
                [ new Bind(
                    {
                        eng: WRITE,
                        "😀": WRITE
                    }, 
                    {
                        eng: "value",
                        "😀": TRANSLATE
                    }, 
                    new NameType(SET_TYPE_VAR_NAMES.eng) 
                ) ], 
                new SetType(new NameType(SET_TYPE_VAR_NAMES.eng)),
                evaluation => {
                    const set = evaluation.getContext();
                    const element = evaluation.resolve("value");
                    if(set instanceof Set && element !== undefined) return set.remove(element);
                    else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                }
            ),            
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "union",
                    "😀": "∪"
                },
                [], 
                [ new Bind(
                    {
                        eng: WRITE,
                        "😀": WRITE
                    }, 
                    {
                        eng: "set",
                        "😀": WRITE
                    }, 
                    new SetType(new NameType(SET_TYPE_VAR_NAMES.eng)) 
                ) ],
                new SetType(new NameType(SET_TYPE_VAR_NAMES.eng)),
                evaluation => {
                    const set = evaluation.getContext();
                    const newSet = evaluation.resolve("set");
                    if(set instanceof Set && newSet instanceof Set) return set.union(newSet);
                    else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                }
            ),
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "intersection",
                    "😀": "∩"
                }, 
                [], 
                [ new Bind(
                    {
                        eng: WRITE,
                        "😀": WRITE
                    }, 
                    {
                        eng: "set",
                        "😀": WRITE
                    }
                ) ], 
                new SetType(new NameType(SET_TYPE_VAR_NAMES.eng)),
                evaluation => {
                    const set = evaluation.getContext();
                    const newSet = evaluation.resolve("set");
                    if(set instanceof Set && newSet instanceof Set) return set.intersection(newSet);
                    else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                }
            ),
            createNativeFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "difference",
                    "😀": TRANSLATE
                }, 
                [], 
                [ new Bind(
                    {
                        eng: WRITE,
                        "😀": WRITE
                    }, 
                    {
                        eng: "set",
                        "😀": WRITE
                    }
                ) ], 
                new SetType(new NameType(SET_TYPE_VAR_NAMES.eng)),
                evaluation => {
                    const set = evaluation.getContext();
                    const newSet = evaluation.resolve("set");
                    if(set instanceof Set && newSet instanceof Set) return set.difference(newSet);
                    else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                }
            ),
            new FunctionDefinition(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "filter",
                    "😀": TRANSLATE
                }, 
                [], 
                [ new Bind(
                    {
                        eng: WRITE,
                        "😀": WRITE
                    }, 
                    {
                        eng: "checker",
                        "😀": TRANSLATE
                    }, 
                    setFilterHOFType
                ) ],
                new NativeHOFSetFilter(setFilterHOFType),
                new SetType(new NameType(SET_TYPE_VAR_NAMES.eng))
            ),

            createNativeConversion(WRITE_DOCS, "{}", "''", (val: Set) => new Text(val.toString())),
            createNativeConversion(WRITE_DOCS, "{}", "[]", (val: Set) => new List(val.values))
        ], false, true)
    );
    
}