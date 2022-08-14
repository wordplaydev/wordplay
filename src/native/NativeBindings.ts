import Alias from "../nodes/Alias";
import type NativeInterface from "./NativeInterface";
import BooleanType from "../nodes/BooleanType";
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

class NativeBindings implements NativeInterface {

    readonly functionsByType: Record<string, Record<string, FunctionDefinition>> = {};
    readonly conversionsByType: Record<string, ConversionDefinition[]> = {};

    addFunction(type: string, fun: FunctionDefinition) {
        if(!(type in this.functionsByType))
            this.functionsByType[type] = {};
        fun.aliases.forEach(a => this.functionsByType[type][a.getName()] = fun);
    }

    addConversion(type: string, con: ConversionDefinition) {
        if(!(type in this.conversionsByType))
            this.conversionsByType[type] = [];
        this.conversionsByType[type].push(con);
    }

    constructor() {

    }    

    getConversion(kind: string, context: ConflictContext, type: Type): ConversionDefinition | undefined {
        return this.conversionsByType[kind].find(c => c.convertsType(type, context));
    }
    getFunction(kind: string, name: string): FunctionDefinition | undefined {
        return this.functionsByType[kind][name];
    }
}

const Native = new NativeBindings();

[
    new FunctionDefinition(
        [], [ new Alias("first", new Language("eng")) ], [], [],
        new NativeExpression(
            // TODO This is wrong.
            new BooleanType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return list.first();
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
            }
        )
    ),
    new FunctionDefinition(
        [], [ new Alias("last", new Language("eng")) ], [], [],
        new NativeExpression(
            // TODO This is wrong.
            new BooleanType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return list.last();
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
            }
        )
    ),
    new FunctionDefinition(
        [], [ new Alias("sansFirst", new Language("eng")) ], [], [],
        new NativeExpression(
            // TODO This is wrong.
            new BooleanType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return list.sansFirst();
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
            }
        )
    ),
    new FunctionDefinition(
        // TODO Documentation
        [], [ new Alias("sansLast", new Language("eng")) ], [], [],
        new NativeExpression(
            // TODO This is wrong.
            new BooleanType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return list.sansLast();
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
            }
        )
    )

].map(f => Native.addFunction("list", f));

[
    new ConversionDefinition(
        [], // TODO Documentation
        "''",
        new NativeExpression(
            "''",
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return new Text(list.toString());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    ),
    new ConversionDefinition(
        [], // TODO Documentation
        "{}",
        new NativeExpression(
            "{}",
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return new SetValue(list.getValues());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    )
].map(c => Native.addConversion("list", c));

[
    new ConversionDefinition(
        [], // TODO Documentation
        "''",
        new NativeExpression(
            "''",
            evaluator => {
                const set = evaluator.getEvaluationContext()?.getContext();
                if(set instanceof SetValue) return new Text(set.toString());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    ),
    new ConversionDefinition(
        [], // TODO Documentation
        "[]",
        new NativeExpression(
            "[]",
            evaluator => {
                const set = evaluator.getEvaluationContext()?.getContext();
                if(set instanceof SetValue) return new List(set.values);
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    ),
].map(c => Native.addConversion("set", c));

[
    new ConversionDefinition(
        [], // TODO Documentation
        "''",
        new NativeExpression(
            "''",
            evaluator => {
                const map = evaluator.getEvaluationContext()?.getContext();
                if(map instanceof MapValue) return new Text(map.toString());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    ),
    new ConversionDefinition(
        [], // TODO Documentation
        "{}",
        new NativeExpression(
            "{}",
            evaluator => {
                const map = evaluator.getEvaluationContext()?.getContext();
                if(map instanceof MapValue) return new SetValue(map.getKeys());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    ),
    new ConversionDefinition(
        [], // TODO Documentation
        "[]",
        new NativeExpression(
            "[]",
            evaluator => {
                const map = evaluator.getEvaluationContext()?.getContext();
                if(map instanceof MapValue) return new List(map.getValues());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    ),
    new ConversionDefinition(
        [], // TODO Documentation
        "''",
        new NativeExpression(
            "''",
            evaluator => {
                const map = evaluator.getEvaluationContext()?.getContext();
                if(map instanceof MapValue) return new SetValue(map.getKeys());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    ),
].map(c => Native.addConversion("map", c));

[
    new ConversionDefinition(
        [], // TODO Documentation
        "''",
        new NativeExpression(
            "''",
            evaluator => {
                const bool = evaluator.getEvaluationContext()?.getContext();
                if(bool instanceof Bool) return new Text(bool.toString());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    )
].map(c => Native.addConversion("boolean", c));

[
    new ConversionDefinition(
        [], // TODO Documentation
        "''",
        new NativeExpression(
            "''",
            evaluator => {
                const none = evaluator.getEvaluationContext()?.getContext();
                if(none instanceof None) return new Text(none.toString());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    )
].map(c => Native.addConversion("none", c));

[
    new ConversionDefinition(
        [], // TODO Documentation
        "[]",
        new NativeExpression(
            "[]",
            evaluator => {
                const text = evaluator.getEvaluationContext()?.getContext();
                if(text instanceof Text) return new List(text.text.split("").map(c => new Text(c)));
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    )
].map(c => Native.addConversion("text", c));

[
    new ConversionDefinition(
        [], // TODO Documentation
        "''",
        new NativeExpression(
            "''''",
            evaluator => {
                const measurement = evaluator.getEvaluationContext()?.getContext();
                if(measurement instanceof Measurement) return new Text(measurement.toString());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    )
].map(c => Native.addConversion("measurement", c));

export default Native;