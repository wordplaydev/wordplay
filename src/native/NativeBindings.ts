import Alias from "../nodes/Alias";
import type NativeInterface from "./NativeInterface";
import FunctionDefinition from "../nodes/FunctionDefinition";
import NativeExpression from "./NativeExpression";
import type { ConflictContext } from "../nodes/Node";
import type Type from "../nodes/Type";
import ConversionDefinition from "../nodes/ConversionDefinition";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Text from "../runtime/Text";
import List from "../runtime/List";
import MapValue from "../runtime/MapValue";
import SetValue from "../runtime/SetValue";
import Bool from "../runtime/Bool";
import None from "../runtime/None";
import Measurement from "../runtime/Measurement";
import type Docs from "../nodes/Docs";
import type TypeVariable from "../nodes/TypeVariable";
import Bind from "../nodes/Bind";
import type Value from "../runtime/Value";
import NameType from "../nodes/NameType";
import ListType from "../nodes/ListType";
import SetOrMapType from "../nodes/SetOrMapType";
import type Evaluation from "../runtime/Evaluation";
import FunctionType from "../nodes/FunctionType";
import NativeHOFListTranslate from "./NativeHOFListTranslate";
import NativeHOFListFilter from "./NativeHOFListFilter";
import NativeHOFListAll from "./NativeHOFListAll";
import BooleanType from "../nodes/BooleanType";
import NativeHOFListUntil from "./NativeHOFListUntil";
import NativeHOFListFind from "./NativeHOFListFind";
import UnionType from "../nodes/UnionType";
import NoneType from "../nodes/NoneType";
import NativeHOFListCombine from "./NativeHOFListCombine";
import NativeHOFSetFilter from "./NativeHOFSetFilter";
import NativeHOFMapFilter from "./NativeHOFMapFilter";
import NativeHOFMapTranslate from "./NativeHOFMapTranslate";
import MeasurementType from "../nodes/MeasurementType";
import TextType from "../nodes/TextType";

class NativeBindings implements NativeInterface {

    readonly functionsByType: Record<string, Record<string, FunctionDefinition>> = {};
    readonly conversionsByType: Record<string, ConversionDefinition[]> = {};

    addFunction(
        kind: string,
        fun: FunctionDefinition
    ) {

        if(!(kind in this.functionsByType))
            this.functionsByType[kind] = {};

        fun.aliases.forEach(a => this.functionsByType[kind][a.getName()] = fun);

    }

    addNativeFunction(
        kind: string, 
        docs: Docs[], 
        aliases: Alias[], 
        typeVars: TypeVariable[], 
        inputs: Bind[], 
        output: Type,
        evaluator: (evaluator: Evaluation) => Value) {
        
        this.addFunction(kind, new FunctionDefinition(
            docs, aliases, typeVars, inputs,
            new NativeExpression(output, evaluator),
            output
        ));

    }

    addConversion(kind: string, docs: Docs[], type: string, expected: Function, fun: Function) {

        if(!(kind in this.conversionsByType))
            this.conversionsByType[kind] = [];

        this.conversionsByType[kind].push(
            new ConversionDefinition(
                docs, type,
                new NativeExpression(
                    type,
                    evaluation => {
                        const val = evaluation.getContext();
                        if(val instanceof expected) return fun.call(undefined, val);
                        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE, val?.toString());                
                    }
                )
            )
        );
    }
    
    getConversion(kind: string, context: ConflictContext, type: Type): ConversionDefinition | undefined {
        if(!(kind in this.conversionsByType)) return undefined;
        return this.conversionsByType[kind].find(c => c.convertsType(type, context));
    }
    getFunction(kind: string, name: string): FunctionDefinition | undefined {
        if(!(kind in this.functionsByType)) return undefined;
        return this.functionsByType[kind][name];
    }
}

const Native = new NativeBindings();

// TODO Documentation
Native.addNativeFunction("text", [], [ new Alias("length", "eng") ], [], [], new MeasurementType(),
    evaluation => {
        const text = evaluation.getContext();
        if(text instanceof Text) return text.length();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE, text?.toString());
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("add", "eng") ], [], 
    [
        new Bind([], undefined, [ new Alias("value", "eng"), ], new NameType("T"))
    ], 
    new NameType("T"),
    evaluation => {
        const list = evaluation.getContext();
        const value = evaluation.resolve('value');
        if(list instanceof List && value !== undefined) return list.add(value);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("length", "eng") ], [], [], new NameType("T"),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.length();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("first", "eng") ], [], [], new NameType("T"),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.first();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("has", "eng") ], [], 
    [
        new Bind([], undefined, [ new Alias("value", "eng"), ], new NameType("T"))
    ], new BooleanType(),
    evaluation => {
        const list = evaluation.getContext();
        const value = evaluation.resolve("value");
        if(list instanceof List && value !== undefined) return list.has(value);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("join", "eng") ], [], 
    [
        new Bind([], undefined, [ new Alias("separator", "eng"), ], new TextType())
    ], new TextType(),
    evaluation => {
        const list = evaluation.getContext();
        const separator = evaluation.resolve("separator");
        if(list instanceof List && separator instanceof Text) return list.join(separator);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("last", "eng") ], [], [], new NameType("T"),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.last();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("sansFirst", "eng") ], [], [], new ListType(new NameType("T")),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.sansFirst();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("sansLast", "eng") ], [], [], new ListType(new NameType("T")),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.sansLast();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("sans", "eng") ], [], 
    [
        new Bind([], undefined, [ new Alias("value", "eng"), ], new NameType("T"))
    ], 
    new ListType(new NameType("T")),
    evaluation => {
        const list = evaluation.getContext();
        const value = evaluation.resolve("value");
        if(list instanceof List && value !== undefined) return list.sans(value);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("sansAll", "eng") ], [], 
    [
        new Bind([], undefined, [ new Alias("value", "eng") ], new NameType("T"))
    ], 
    new ListType(new NameType("T")),
    evaluation => {
        const list = evaluation.getContext();
        const value = evaluation.resolve("value");
        if(list instanceof List && value !== undefined) return list.sansAll(value);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("list", [], [ new Alias("reverse", "eng") ], [], [], new ListType(new NameType("T")),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.reverse();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addFunction("list", new FunctionDefinition(
    [], 
    [ new Alias("translate", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("translator", "eng")], new FunctionType([ 
            {
                aliases: [ new Alias("value", "eng") ],
                type: new NameType("T"),
                required: true,
                rest: false,
                default: undefined
            }
        ], new NameType("T")))
    ],
    new NativeHOFListTranslate(),
    new ListType(new NameType("T"))
));

// TODO Documentation
Native.addFunction("list", new FunctionDefinition(
    [], 
    [ new Alias("filter", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("include", "eng")], new FunctionType([ 
            {
                aliases: [ new Alias("value", "eng") ],
                type: new BooleanType(),
                required: true,
                rest: false,
                default: undefined
            }
        ], new NameType("T")))
    ],
    new NativeHOFListFilter(),
    new ListType(new NameType("T"))
));

// TODO Documentation
Native.addFunction("list", new FunctionDefinition(
    [], 
    [ new Alias("all", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("matcher", "eng")], new FunctionType([ 
            {
                aliases: [ new Alias("value", "eng") ],
                type: new BooleanType(),
                required: true,
                rest: false,
                default: undefined
            }
        ], new NameType("T")))
    ],
    new NativeHOFListAll(),
    new ListType(new NameType("T"))
));

// TODO Documentation
Native.addFunction("list", new FunctionDefinition(
    [], 
    [ new Alias("until", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("checker", "eng")], new FunctionType([ 
            {
                aliases: [ new Alias("value", "eng") ],
                type: new BooleanType(),
                required: true,
                rest: false,
                default: undefined
            }
        ], new NameType("T")))
    ],
    new NativeHOFListUntil(),
    new ListType(new NameType("T"))
));

// TODO Documentation
Native.addFunction("list", new FunctionDefinition(
    [], 
    [ new Alias("find", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("checker", "eng")], new FunctionType([ 
            {
                aliases: [ new Alias("value", "eng") ],
                type: new BooleanType(),
                required: true,
                rest: false,
                default: undefined
            }
        ], new NameType("T")))
    ],
    new NativeHOFListFind(),
    new UnionType(new NameType("T"), new NoneType([ new Alias("notfound", "eng")]))
));

// TODO Documentation
Native.addFunction("list", new FunctionDefinition(
    [], 
    [ new Alias("combine", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("initial", "eng")]),
        new Bind([], undefined, [ new Alias("combiner", "eng")], new FunctionType([ 
            {
                aliases: [ new Alias("combination", "eng") ],
                type: new NameType("V"),
                required: true,
                rest: false,
                default: undefined
            },
            {
                aliases: [ new Alias("next", "eng") ],
                type: new NameType("T"),
                required: true,
                rest: false,
                default: undefined
            }
        ], new NameType("V")))
    ],
    new NativeHOFListCombine(),
    new ListType(new NameType("T"))
));

// TODO Documentation
Native.addNativeFunction("set", [], [ new Alias("add", "eng") ], [], [ new Bind([], undefined, [ new Alias("value", "eng") ] ) ], new NameType("T"),
evaluation => {
        const set = evaluation?.getContext();
        const element = evaluation.resolve("value");
        if(set instanceof SetValue && element !== undefined) return set.add(element);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("set", [], [ new Alias("remove", "eng") ], [], [ new Bind([], undefined, [ new Alias("value", "eng") ] ) ], new SetOrMapType(undefined, undefined, new NameType("T")),
    evaluation => {
        const set = evaluation.getContext();
        const element = evaluation.resolve("value");
        if(set instanceof SetValue && element !== undefined) return set.remove(element);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("set", [], [ new Alias("union", "eng") ], [], [ new Bind([], undefined, [ new Alias("set", "eng") ] ) ], new SetOrMapType(undefined, undefined, new NameType("T")),
    evaluation => {
        const set = evaluation.getContext();
        const newSet = evaluation.resolve("set");
        if(set instanceof SetValue && newSet instanceof SetValue) return set.union(newSet);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("set", [], [ new Alias("intersection", "eng") ], [], [ new Bind([], undefined, [ new Alias("set", "eng") ] ) ], new SetOrMapType(undefined, undefined, new NameType("T")),
    evaluation => {
        const set = evaluation.getContext();
        const newSet = evaluation.resolve("set");
        if(set instanceof SetValue && newSet instanceof SetValue) return set.intersection(newSet);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("set", [], [ new Alias("difference", "eng") ], [], [ new Bind([], undefined, [ new Alias("set", "eng") ] ) ], new SetOrMapType(undefined, undefined, new NameType("T")),
    evaluation => {
        const set = evaluation.getContext();
        const newSet = evaluation.resolve("set");
        if(set instanceof SetValue && newSet instanceof SetValue) return set.difference(newSet);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addFunction("set", new FunctionDefinition(
    [], 
    [ new Alias("filter", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("checker", "eng")], new FunctionType([ 
            {
                aliases: [ new Alias("value", "eng") ],
                type: new BooleanType(),
                required: true,
                rest: false,
                default: undefined
            }
        ], new NameType("T")))
    ],
    new NativeHOFSetFilter(),
    new SetOrMapType(undefined, undefined, new NameType("T"))
));

// TODO Documentation
Native.addNativeFunction("map", [], [ new Alias("set", "eng") ], [], 
    [ 
        new Bind([], undefined, [ new Alias("key", "eng") ], new NameType("K") ),
        new Bind([], undefined, [ new Alias("value", "eng") ], new NameType("V") )
    ],
    new SetOrMapType(),
    evaluation => {
        const map = evaluation.getContext();
        const key = evaluation.resolve("key");
        const value = evaluation.resolve("value");
        if(map instanceof MapValue && key !== undefined && value !== undefined) return map.set(key, value);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("map", [], [ new Alias("unset", "eng") ], [], 
    [ 
        new Bind([], undefined, [ new Alias("key", "eng") ], new NameType("K") )
    ],
    new SetOrMapType(),
    evaluation => {
        const map = evaluation.getContext();
        const key = evaluation.resolve("key");
        if(map instanceof MapValue && key !== undefined) return map.unset(key);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addNativeFunction("map", [], [ new Alias("remove", "eng") ], [], 
    [ 
        new Bind([], undefined, [ new Alias("value", "eng") ], new NameType("V") )
    ],
    new SetOrMapType(),
    evaluation => {
        const map = evaluation.getContext();
        const value = evaluation.resolve("value");
        if(map instanceof MapValue && value !== undefined) return map.remove(value);
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addFunction("map", new FunctionDefinition(
    [], 
    [ new Alias("filter", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("checker", "eng")], new FunctionType([ 
            {
                aliases: [ new Alias("key", "eng") ],
                type: new BooleanType(),
                required: true,
                rest: false,
                default: undefined
            },
            {
                aliases: [ new Alias("value", "eng") ],
                type: new BooleanType(),
                required: true,
                rest: false,
                default: undefined
            }
        ], new NameType("T")))
    ],
    new NativeHOFMapFilter(),
    new SetOrMapType(undefined, undefined, new NameType("K"), undefined, new NameType("V"))
));

// TODO Documentation
Native.addFunction("map", new FunctionDefinition(
    [], 
    [ new Alias("translate", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("translator", "eng")], new FunctionType([ 
            {
                aliases: [ new Alias("key", "eng") ],
                type: new BooleanType(),
                required: true,
                rest: false,
                default: undefined
            },
            {
                aliases: [ new Alias("value", "eng") ],
                type: new BooleanType(),
                required: true,
                rest: false,
                default: undefined
            }
        ], new NameType("T")))
    ],
    new NativeHOFMapTranslate(),
    new SetOrMapType(undefined, undefined, new NameType("K"), undefined, new NameType("V"))
));

// TODO Documentation
Native.addConversion("list", [],  "''", List, (val: List) => new Text(val.toString())),
// TODO Documentation
Native.addConversion("list", [],  "{}", List, (val: List) => new SetValue(val.getValues())),

// TODO Documentation
Native.addConversion("set", [], "''", SetValue, (val: SetValue) => new Text(val.toString()));
// TODO Documentation
Native.addConversion("set", [], "[]", SetValue, (val: SetValue) => new List(val.values));

// TODO Documentation
Native.addConversion("map", [], "''", MapValue, (val: MapValue) => new Text(val.toString()));
// TODO Documentation
Native.addConversion("map", [], "{}", MapValue, (val: MapValue) => new SetValue(val.getKeys()));
// TODO Documentation
Native.addConversion("map", [], "[]", MapValue, (val: MapValue) => new List(val.getValues()));

// TODO Documentation
Native.addConversion("boolean", [], "''", Bool, (val: Bool) => new Text(val.toString()));

// TODO Documentation
Native.addConversion("none", [], "''", None, (val: None) => new Text(val.toString()));

// TODO Documentation
Native.addConversion("text", [], "[]", Text, (val: Text) => new List(val.text.split("").map(c => new Text(c))));

// TODO Documentation
Native.addConversion("measurement", [], "''", Measurement, (val: Measurement) => new Text(val.toString()));

export default Native;