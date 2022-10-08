import Alias from "../nodes/Alias";
import AnyType from "../nodes/AnyType";
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
import SetValue from "../runtime/SetValue";
import StructureDefinition from "../nodes/StructureDefinition";
import TypeVariable from "../nodes/TypeVariable";
import Block from "../nodes/Block";

export default function bootstrapList() {

    const listTranslateHOFType = new FunctionType([ 
        new Bind(
            [],
            undefined,
            [ new Alias("value", "eng") ],
            new NameType(LIST_TYPE_VAR_NAME)
        )
    ], new AnyType());

    const listFilterHOFType = new FunctionType([ 
        new Bind(
            [], 
            undefined, 
            [ new Alias("value", "eng") ],
            new NameType(LIST_TYPE_VAR_NAME)
        )
    ], new BooleanType());

    const listAllHOFType = new FunctionType([ 
        new Bind(
            [],
            undefined,
            [ new Alias("value", "eng") ],
            new NameType(LIST_TYPE_VAR_NAME)
        )
    ], new BooleanType());


    const listUntilHOFType = new FunctionType([ 
        new Bind(
            [],
            undefined,
            [ new Alias("value", "eng") ],
            new BooleanType(),
        )
    ], new NameType(LIST_TYPE_VAR_NAME));


    const listFindHOFType = new FunctionType([ 
        new Bind(
            [],
            undefined,
            [ new Alias("value", "eng") ],
            new BooleanType()
        )
    ], new NameType(LIST_TYPE_VAR_NAME));


    const listCombineHOFType = new FunctionType([ 
        new Bind(
            [],
            undefined,
            [ new Alias("combination", "eng") ],
            new NameType(LIST_TYPE_VAR_NAME)
        ),
        new Bind(
            [],
            undefined,
            [ new Alias("next", "eng") ],
            new NameType(LIST_TYPE_VAR_NAME)
        )
    ], new NameType(LIST_TYPE_VAR_NAME));

    return new StructureDefinition(
        // TODO Localized documentation
        [],
        [],
        // No interfaces
        [],
        // One type variable
        [ new TypeVariable(LIST_TYPE_VAR_NAME)],
        // No inputs
        [],
        // Include all of the functions defined above.
        new Block([], [
            createNativeFunction([], [ new Alias("add", "eng") ], [], 
                [
                    new Bind([], undefined, [ new Alias("value", "eng"), ], new NameType(LIST_TYPE_VAR_NAME))
                ],
                new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve('value');
                    if(list instanceof List && value !== undefined) return list.add(value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("length", "eng") ], [], [], new MeasurementType(),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.length();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("random", "eng") ], [], [], new NameType(LIST_TYPE_VAR_NAME),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.random();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("first", "eng") ], [], [], new NameType(LIST_TYPE_VAR_NAME),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.first();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("has", "eng") ], [], 
                [ new Bind([], undefined, [ new Alias("value", "eng"), ], new NameType(LIST_TYPE_VAR_NAME)) ], 
                new BooleanType(),
                evaluation => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.has(value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("join", "eng") ], [], 
                [
                    new Bind([], undefined, [ new Alias("separator", "eng"), ], new TextType())
                ], new TextType(),
                evaluation => {
                    const list = evaluation.getContext();
                    const separator = evaluation.resolve("separator");
                    if(list instanceof List && separator instanceof Text) return list.join(separator);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("last", "eng") ], [], [], new NameType(LIST_TYPE_VAR_NAME),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.last();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("sansFirst", "eng") ], [], [], new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.sansFirst();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("sansLast", "eng") ], [], [], new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.sansLast();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("sans", "eng") ], [], 
                [
                    new Bind([], undefined, [ new Alias("value", "eng"), ], new NameType(LIST_TYPE_VAR_NAME))
                ], 
                new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.sans(value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("sansAll", "eng") ], [], 
                [
                    new Bind([], undefined, [ new Alias("value", "eng") ], new NameType(LIST_TYPE_VAR_NAME))
                ], 
                new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    const value = evaluation.resolve("value");
                    if(list instanceof List && value !== undefined) return list.sansAll(value);
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            createNativeFunction([], [ new Alias("reverse", "eng") ], [], [], new ListType(new NameType(LIST_TYPE_VAR_NAME)),
                evaluation => {
                    const list = evaluation.getContext();
                    if(list instanceof List) return list.reverse();
                    else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                }
            ),
            new FunctionDefinition(
                [], [ new Alias("=") ], [], 
                [ new Bind([], undefined, [ new Alias("value", "eng")], new ListType()) ],
                new NativeExpression(new BooleanType(), 
                    evaluation => {
                        const list = evaluation.getContext();
                        const value = evaluation.resolve("value");
                        if(!(list instanceof List)) return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                        if(!(value instanceof Value)) return new TypeException(evaluation.getEvaluator(), new ListType(), value);
                        return new Bool(list.isEqualTo(value));
                    },
                    {
                        "eng": "Comparing list values."
                    }
                ),
                new BooleanType()
            ),
            new FunctionDefinition(
                [], [ new Alias("≠") ], [], 
                [ new Bind([], undefined, [ new Alias("value", "eng")], new ListType()) ],
                new NativeExpression(new BooleanType(), 
                    evaluation => {
                        const list = evaluation.getContext();
                        const value = evaluation.resolve("value");
                        if(!(list instanceof List)) return new TypeException(evaluation.getEvaluator(), new ListType(), list);
                        if(!(value instanceof Value)) return new TypeException(evaluation.getEvaluator(), new ListType(), value);
                        return new Bool(!list.isEqualTo(value));
                    },
                    {
                        "eng": "Comparing list values."
                    }
                ),
                new BooleanType()
            ),
            new FunctionDefinition(
                [], 
                [ new Alias("translate", "eng") ], 
                [], 
                [
                    new Bind([], undefined, [ new Alias("translator", "eng")], listTranslateHOFType)
                ],
                new NativeHOFListTranslate(listTranslateHOFType),
                new ListType(new NameType(LIST_TYPE_VAR_NAME))
            ),
            new FunctionDefinition(
                [], 
                [ new Alias("filter", "eng") ], 
                [], 
                [
                    new Bind([], undefined, [ new Alias("include", "eng")], listFilterHOFType)
                ],
                new NativeHOFListFilter(listFilterHOFType),
                new ListType(new NameType(LIST_TYPE_VAR_NAME))
            ),
            new FunctionDefinition(
                [], 
                [ new Alias("all", "eng") ], 
                [], 
                [
                    new Bind([], undefined, [ new Alias("matcher", "eng")], listAllHOFType)
                ],
                new NativeHOFListAll(listAllHOFType),
                new BooleanType()
            ),        
            new FunctionDefinition(
                [], 
                [ new Alias("until", "eng") ], 
                [], 
                [
                    new Bind([], undefined, [ new Alias("checker", "eng")], listUntilHOFType)
                ],
                new NativeHOFListUntil(listUntilHOFType),
                new ListType(new NameType(LIST_TYPE_VAR_NAME))
            ),
            new FunctionDefinition(
                [], 
                [ new Alias("find", "eng") ], 
                [], 
                [
                    new Bind([], undefined, [ new Alias("checker", "eng")], listFindHOFType)
                ],
                new NativeHOFListFind(listFindHOFType),
                new UnionType(new NameType(LIST_TYPE_VAR_NAME), new NoneType([ new Alias("notfound", "eng")]))
            ),        
            new FunctionDefinition(
                [], 
                [ new Alias("combine", "eng") ], 
                [], 
                [
                    new Bind([], undefined, [ new Alias("initial", "eng")]),
                    new Bind([], undefined, [ new Alias("combiner", "eng")], listCombineHOFType)
                ],
                new NativeHOFListCombine(listCombineHOFType),
                new ListType(new NameType(LIST_TYPE_VAR_NAME))
            ),
            createNativeConversion([],  "[]", "''", (val: List) => new Text(val.toString())),
            createNativeConversion([],  "[]", "{}", (val: List) => new SetValue(val.getValues()))        
        ], false, true)
    );
    
}