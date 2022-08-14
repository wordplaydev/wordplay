import Alias from "../nodes/Alias";
import type NativeInterface from "./NativeInterface";
import FunctionDefinition from "../nodes/FunctionDefinition";
import Language from "../nodes/Language";
import NativeExpression from "../nodes/NativeExpression";
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
import type Bind from "../nodes/Bind";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import NameType from "../nodes/NameType";
import ListType from "../nodes/ListType";

class NativeBindings implements NativeInterface {

    readonly functionsByType: Record<string, Record<string, FunctionDefinition>> = {};
    readonly conversionsByType: Record<string, ConversionDefinition[]> = {};

    addFunction(
        kind: string, 
        docs: Docs[], 
        aliases: Alias[], 
        typeVars: TypeVariable[], 
        inputs: Bind[], 
        output: Type,
        evaluator: (evaluator: Evaluator) => Value) {
        
        if(!(kind in this.functionsByType))
            this.functionsByType[kind] = {};

        const fun = new FunctionDefinition(
            docs, aliases, typeVars, inputs,
            new NativeExpression(output, evaluator ),
            output
        );

        fun.aliases.forEach(a => this.functionsByType[kind][a.getName()] = fun);
    }

    addConversion(kind: string, docs: Docs[], type: string, expected: Function, fun: Function) {

        if(!(kind in this.conversionsByType))
            this.conversionsByType[kind] = [];

        this.conversionsByType[kind].push(
            new ConversionDefinition(
                docs, type,
                new NativeExpression(
                    type,
                    evaluator => {
                        const val = evaluator.getEvaluationContext()?.getContext();
                        if(val instanceof expected) return fun.call(undefined, val);
                        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
                    }
                )
            )
        );
    }
    
    getConversion(kind: string, context: ConflictContext, type: Type): ConversionDefinition | undefined {
        return this.conversionsByType[kind].find(c => c.convertsType(type, context));
    }
    getFunction(kind: string, name: string): FunctionDefinition | undefined {
        return this.functionsByType[kind][name];
    }
}

const Native = new NativeBindings();

// TODO Documentation
Native.addFunction("list", [], [ new Alias("first", new Language("eng")) ], [], [], new NameType("T"),
    evaluator => {
        const list = evaluator.getEvaluationContext()?.getContext();
        if(list instanceof List) return list.first();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

Native.addFunction("list", [], [ new Alias("last", new Language("eng")) ], [], [], new NameType("T"),
    evaluator => {
        const list = evaluator.getEvaluationContext()?.getContext();
        if(list instanceof List) return list.last();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

Native.addFunction("list", [], [ new Alias("withoutFirst", new Language("eng")) ], [], [], new ListType(new NameType("T")),
    evaluator => {
        const list = evaluator.getEvaluationContext()?.getContext();
        if(list instanceof List) return list.sansFirst();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

Native.addFunction("list", [], [ new Alias("withoutLast", new Language("eng")) ], [], [], new ListType(new NameType("T")),
    evaluator => {
        const list = evaluator.getEvaluationContext()?.getContext();
        if(list instanceof List) return list.sansLast();
        else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
    }
);

// TODO Documentation
Native.addConversion("list", [],  "''", List, (val: List) => new Text(val.toString())),
Native.addConversion("list", [],  "{}", List, (val: List) => new SetValue(val.getValues())),

Native.addConversion("set", [], "''", SetValue, (val: SetValue) => new Text(val.toString()));
Native.addConversion("set", [], "[]", SetValue, (val: SetValue) => new List(val.values));

Native.addConversion("map", [], "''", MapValue, (val: MapValue) => new Text(val.toString()));
Native.addConversion("map", [], "{}", MapValue, (val: MapValue) => new SetValue(val.getKeys()));
Native.addConversion("map", [], "[]", MapValue, (val: MapValue) => new List(val.getValues()));

Native.addConversion("boolean", [], "''", Bool, (val: Bool) => new Text(val.toString()));

Native.addConversion("none", [], "''", None, (val: None) => new Text(val.toString()));

Native.addConversion("text", [], "[]", Text, (val: Text) => new List(val.text.split("").map(c => new Text(c))));

Native.addConversion("measurement", [], "''", Measurement, (val: Measurement) => new Text(val.toString()));

export default Native;