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
import { SET_TYPE_VAR_NAME } from "./NativeConstants";
import NativeHOFSetFilter from "./NativeHOFSetFilter";
import Bool from "../runtime/Bool";
import Alias from "../nodes/Alias";

export default function bootstrapSet() {

    const setFilterHOFType = new FunctionType([ 
        new Bind(
            [],
            undefined,
            [ new Alias("value", "eng") ],
            new BooleanType()
        )
    ], new NameType(SET_TYPE_VAR_NAME));
    
    return new StructureDefinition(
        [],
        [],
        // No interfaces
        [],
        // One type variable
        [ new TypeVariable(SET_TYPE_VAR_NAME)],
        // No inputs
        [],
        // Include all of the functions defined above.
        new Block([], [
            createNativeFunction(
                [], 
                [ new Alias("=") ], 
                [], 
                [ new Bind([], undefined, [ new Alias("set", "eng") ], new SetType() ) ], 
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
                [], 
                [ new Alias("≠") ], 
                [], 
                [ new Bind([], undefined, [ new Alias("set", "eng") ], new SetType() ) ], 
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
                [], 
                [ new Alias("add", "eng") ], 
                [], 
                [ new Bind([], undefined, [ new Alias("value", "eng") ], new NameType(SET_TYPE_VAR_NAME) ) ], 
                new SetType(new NameType(SET_TYPE_VAR_NAME)),
                evaluation => {
                        const set = evaluation?.getContext();
                        const element = evaluation.resolve("value");
                        if(set instanceof Set && element !== undefined) return set.add(element);
                        else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                    }
            ),
            createNativeFunction(
                [], 
                [ new Alias("remove", "eng") ],
                [], 
                [ new Bind([], undefined, [ new Alias("value", "eng") ], new NameType(SET_TYPE_VAR_NAME) ) ], 
                new SetType(new NameType(SET_TYPE_VAR_NAME)),
                evaluation => {
                    const set = evaluation.getContext();
                    const element = evaluation.resolve("value");
                    if(set instanceof Set && element !== undefined) return set.remove(element);
                    else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                }
            ),            
            createNativeFunction(
                [], 
                [ new Alias("union", "eng") ],
                [], 
                [ new Bind([], undefined, [ new Alias("set", "eng") ], new SetType(new NameType(SET_TYPE_VAR_NAME)) ) ],
                new SetType(new NameType(SET_TYPE_VAR_NAME)),
                evaluation => {
                    const set = evaluation.getContext();
                    const newSet = evaluation.resolve("set");
                    if(set instanceof Set && newSet instanceof Set) return set.union(newSet);
                    else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                }
            ),
            createNativeFunction([], [ new Alias("intersection", "eng") ], [], [ new Bind([], undefined, [ new Alias("set", "eng") ] ) ], new SetType(new NameType(SET_TYPE_VAR_NAME)),
                evaluation => {
                    const set = evaluation.getContext();
                    const newSet = evaluation.resolve("set");
                    if(set instanceof Set && newSet instanceof Set) return set.intersection(newSet);
                    else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                }
            ),
            createNativeFunction([], [ new Alias("difference", "eng") ], [], [ new Bind([], undefined, [ new Alias("set", "eng") ] ) ], new SetType(new NameType(SET_TYPE_VAR_NAME)),
                evaluation => {
                    const set = evaluation.getContext();
                    const newSet = evaluation.resolve("set");
                    if(set instanceof Set && newSet instanceof Set) return set.difference(newSet);
                    else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
                }
            ),
            new FunctionDefinition(
                [], 
                [ new Alias("filter", "eng") ], 
                [], 
                [
                    new Bind([], undefined, [ new Alias("checker", "eng")], setFilterHOFType)
                ],
                new NativeHOFSetFilter(setFilterHOFType),
                new SetType(new NameType(SET_TYPE_VAR_NAME))
            ),

            createNativeConversion([], "{}", "''", (val: Set) => new Text(val.toString())),
            createNativeConversion([], "{}", "[]", (val: Set) => new List(val.values))
        ], false, true)
    );
    
}