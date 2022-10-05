import Alias from "../nodes/Alias";
import type NativeInterface from "./NativeInterface";
import FunctionDefinition from "../nodes/FunctionDefinition";
import NativeExpression from "./NativeExpression";
import type Context from "../nodes/Context";
import type Type from "../nodes/Type";
import ConversionDefinition from "../nodes/ConversionDefinition";
import Text from "../runtime/Text";
import List from "../runtime/List";
import MapValue from "../runtime/MapValue";
import SetValue from "../runtime/SetValue";
import type Documentation from "../nodes/Documentation";
import TypeVariable from "../nodes/TypeVariable";
import Bind from "../nodes/Bind";
import Value from "../runtime/Value";
import NameType from "../nodes/NameType";
import ListType from "../nodes/ListType";
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
import SetType from "../nodes/SetType";
import MapType from "../nodes/MapType";
import StructureDefinition from "../nodes/StructureDefinition";
import Block from "../nodes/Block";
import { BOOLEAN_NATIVE_TYPE_NAME, LIST_NATIVE_TYPE_NAME, LIST_TYPE_VAR_NAME, MAP_KEY_TYPE_VAR_NAME, MAP_NATIVE_TYPE_NAME, MAP_VALUE_TYPE_VAR_NAME, MEASUREMENT_NATIVE_TYPE_NAME, NONE_NATIVE_TYPE_NME, SET_NATIVE_TYPE_NAME, SET_TYPE_VAR_NAME, TEXT_NATIVE_TYPE_NAME } from "./NativeConstants";
import AnyType from "../nodes/AnyType";
import TypeException from "../runtime/TypeException";
import type Bool from "../runtime/Bool";
import type None from "../runtime/None";
import Measurement from "../runtime/Measurement";
import { parseType, tokens } from "../parser/Parser";
import Unparsable from "../nodes/Unparsable";
import Unit from "../nodes/Unit";

class NativeBindings implements NativeInterface {

    readonly functionsByType: Record<string, Record<string, FunctionDefinition>> = {};
    readonly conversionsByType: Record<string, ConversionDefinition[]> = {};
    readonly structureDefinitionsByName: Record<string, StructureDefinition> = {};

    addFunction(
        kind: string,
        fun: FunctionDefinition
    ) {

        if(!(kind in this.functionsByType))
            this.functionsByType[kind] = {};

        fun.aliases.forEach(a => {
            const name = a.getName();
            if(name !== undefined)
                this.functionsByType[kind][name] = fun
        });

    }

    addNativeFunction(
        kind: string, 
        docs: Documentation[], 
        aliases: Alias[], 
        typeVars: TypeVariable[], 
        inputs: Bind[], 
        output: Type,
        evaluator: (evaluator: Evaluation) => Value) {

            this.addFunction(kind, new FunctionDefinition(
                docs, aliases, typeVars, inputs,
                new NativeExpression(
                    output, 
                    evaluator, 
                    {
                        "eng": docs.find(doc => doc.lang?.getLanguage() === "eng")?.docs.getText() ?? "No documentatinon"
                    }
                ),
                output
            ));

    }

    addConversion(kind: string, docs: Documentation[], inputTypeString: string, outputTypeString: string, fun: Function) {

        if(!(kind in this.conversionsByType))
            this.conversionsByType[kind] = [];

        // Parse the expected type.
        const inputType = parseType(tokens(inputTypeString));
        if(inputType instanceof Unparsable)
            throw new Error(`Native conversion has unparsable output type: ${inputTypeString}`);

        this.conversionsByType[kind].push(
            new ConversionDefinition(
                docs, inputType, outputTypeString,
                new NativeExpression(
                    outputTypeString,
                    evaluation => {
                        const val = evaluation.getContext();
                        if(val instanceof Value && val.getType().isCompatible(inputType, evaluation.getEvaluator().getContext())) return fun.call(undefined, val);
                        else return new TypeException(evaluation.getEvaluator(), inputType, val); 
                    },
                    {
                        "eng": docs.find(doc => doc.lang?.getLanguage() === "eng")?.docs.getText() ?? "No documentatinon"
                    }
                )
            )
        );
    }

    addStructure(kind: string, structure: StructureDefinition) {

        // Cache the parents of the nodes, "crystalizing" it.
        // This means there should be no future changes to the native structure definition.
        structure.cacheParents();
        this.structureDefinitionsByName[kind] = structure;
    }
    
    getConversion(kind: string, context: Context, input: Type, output: Type): ConversionDefinition | undefined {
        if(!(kind in this.conversionsByType)) return undefined;
        return this.conversionsByType[kind].find(c => 
            c.convertsTypeTo(input, output, context));
    }

    getAllConversions() {
        // Copy it so that callers can't modify it.
        return Object.values(this.conversionsByType).reduce((all: ConversionDefinition[], next: ConversionDefinition[]) => [ ...all, ...next ], []);
    }
    
    getFunction(kind: string, name: string): FunctionDefinition | undefined {
        if(!(kind in this.functionsByType)) return undefined;
        return this.functionsByType[kind][name];
    }

    getStructureDefinition(kind: string): StructureDefinition | undefined {
        return this.structureDefinitionsByName[kind];
    }

}

const Native = new NativeBindings();

// TODO Documentation
Native.addNativeFunction(TEXT_NATIVE_TYPE_NAME, [], [ new Alias("length", "eng") ], [], [], new MeasurementType(),
    evaluation => {
        const text = evaluation.getContext();
        if(text instanceof Text) return text.length();
        else return new TypeException(evaluation.getEvaluator(), new TextType(), text);
    }
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("add", "eng") ], [], 
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
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("length", "eng") ], [], [], new MeasurementType(),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.length();
        else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
    }
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("random", "eng") ], [], [], new NameType(LIST_TYPE_VAR_NAME),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.random();
        else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
    }
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("first", "eng") ], [], [], new NameType(LIST_TYPE_VAR_NAME),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.first();
        else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
    }
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("has", "eng") ], [], 
    [ new Bind([], undefined, [ new Alias("value", "eng"), ], new NameType(LIST_TYPE_VAR_NAME)) ], 
    new BooleanType(),
    evaluation => {
        const list = evaluation.getContext();
        const value = evaluation.resolve("value");
        if(list instanceof List && value !== undefined) return list.has(value);
        else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
    }
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("join", "eng") ], [], 
    [
        new Bind([], undefined, [ new Alias("separator", "eng"), ], new TextType())
    ], new TextType(),
    evaluation => {
        const list = evaluation.getContext();
        const separator = evaluation.resolve("separator");
        if(list instanceof List && separator instanceof Text) return list.join(separator);
        else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
    }
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("last", "eng") ], [], [], new NameType(LIST_TYPE_VAR_NAME),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.last();
        else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
    }
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("sansFirst", "eng") ], [], [], new ListType(new NameType(LIST_TYPE_VAR_NAME)),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.sansFirst();
        else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
    }
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("sansLast", "eng") ], [], [], new ListType(new NameType(LIST_TYPE_VAR_NAME)),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.sansLast();
        else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
    }
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("sans", "eng") ], [], 
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
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("sansAll", "eng") ], [], 
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
);

// TODO Documentation
Native.addNativeFunction(LIST_NATIVE_TYPE_NAME, [], [ new Alias("reverse", "eng") ], [], [], new ListType(new NameType(LIST_TYPE_VAR_NAME)),
    evaluation => {
        const list = evaluation.getContext();
        if(list instanceof List) return list.reverse();
        else return new TypeException(evaluation.getEvaluator(), new ListType(), list);
    }
);

// TODO Documentation
const listTranslateHOFType = new FunctionType([ 
    new Bind(
        [],
        undefined,
        [ new Alias("value", "eng") ],
        new NameType(LIST_TYPE_VAR_NAME)
    )
], new AnyType());

Native.addFunction(LIST_NATIVE_TYPE_NAME, new FunctionDefinition(
    [], 
    [ new Alias("translate", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("translator", "eng")], listTranslateHOFType)
    ],
    new NativeHOFListTranslate(listTranslateHOFType),
    new ListType(new NameType(LIST_TYPE_VAR_NAME))
));

// TODO Documentation
const listFilterHOFType = new FunctionType([ 
    new Bind(
        [], 
        undefined, 
        [ new Alias("value", "eng") ],
        new NameType(LIST_TYPE_VAR_NAME)
    )
], new BooleanType());

Native.addFunction(LIST_NATIVE_TYPE_NAME, new FunctionDefinition(
    [], 
    [ new Alias("filter", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("include", "eng")], listFilterHOFType)
    ],
    new NativeHOFListFilter(listFilterHOFType),
    new ListType(new NameType(LIST_TYPE_VAR_NAME))
));

// TODO Documentation
const listAllHOFType = new FunctionType([ 
    new Bind(
        [],
        undefined,
        [ new Alias("value", "eng") ],
        new NameType(LIST_TYPE_VAR_NAME)
    )
], new BooleanType());

Native.addFunction(LIST_NATIVE_TYPE_NAME, new FunctionDefinition(
    [], 
    [ new Alias("all", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("matcher", "eng")], listAllHOFType)
    ],
    new NativeHOFListAll(listAllHOFType),
    new BooleanType()
));

// TODO Documentation
const listUntilHOFType = new FunctionType([ 
    new Bind(
        [],
        undefined,
        [ new Alias("value", "eng") ],
        new BooleanType(),
    )
], new NameType(LIST_TYPE_VAR_NAME));

Native.addFunction(LIST_NATIVE_TYPE_NAME, new FunctionDefinition(
    [], 
    [ new Alias("until", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("checker", "eng")], listUntilHOFType)
    ],
    new NativeHOFListUntil(listUntilHOFType),
    new ListType(new NameType(LIST_TYPE_VAR_NAME))
));

// TODO Documentation
const listFindHOFType = new FunctionType([ 
    new Bind(
        [],
        undefined,
        [ new Alias("value", "eng") ],
        new BooleanType()
    )
], new NameType(LIST_TYPE_VAR_NAME));

Native.addFunction(LIST_NATIVE_TYPE_NAME, new FunctionDefinition(
    [], 
    [ new Alias("find", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("checker", "eng")], listFindHOFType)
    ],
    new NativeHOFListFind(listFindHOFType),
    new UnionType(new NameType(LIST_TYPE_VAR_NAME), new NoneType([ new Alias("notfound", "eng")]))
));

// TODO Documentation
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

Native.addFunction(LIST_NATIVE_TYPE_NAME, new FunctionDefinition(
    [], 
    [ new Alias("combine", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("initial", "eng")]),
        new Bind([], undefined, [ new Alias("combiner", "eng")], listCombineHOFType)
    ],
    new NativeHOFListCombine(listCombineHOFType),
    new ListType(new NameType(LIST_TYPE_VAR_NAME))
));

// TODO Documentation
Native.addNativeFunction(
    SET_NATIVE_TYPE_NAME, 
    [], 
    [ new Alias("add", "eng") ], 
    [], 
    [ new Bind([], undefined, [ new Alias("value", "eng") ], new NameType(SET_TYPE_VAR_NAME) ) ], 
    new SetType(undefined, undefined, new NameType(SET_TYPE_VAR_NAME)),
    evaluation => {
            const set = evaluation?.getContext();
            const element = evaluation.resolve("value");
            if(set instanceof SetValue && element !== undefined) return set.add(element);
            else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
        }
);

// TODO Documentation
Native.addNativeFunction(
    SET_NATIVE_TYPE_NAME, 
    [], 
    [ new Alias("remove", "eng") ],
    [], 
    [ new Bind([], undefined, [ new Alias("value", "eng") ], new NameType(SET_TYPE_VAR_NAME) ) ], 
    new SetType(undefined, undefined, new NameType(SET_TYPE_VAR_NAME)),
    evaluation => {
        const set = evaluation.getContext();
        const element = evaluation.resolve("value");
        if(set instanceof SetValue && element !== undefined) return set.remove(element);
        else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
    }
);

// TODO Documentation
Native.addNativeFunction(
    SET_NATIVE_TYPE_NAME, 
    [], 
    [ new Alias("union", "eng") ],
    [], 
    [ new Bind([], undefined, [ new Alias("set", "eng") ], new SetType(undefined, undefined, new NameType(SET_TYPE_VAR_NAME)) ) ],
    new SetType(undefined, undefined, new NameType(SET_TYPE_VAR_NAME)),
    evaluation => {
        const set = evaluation.getContext();
        const newSet = evaluation.resolve("set");
        if(set instanceof SetValue && newSet instanceof SetValue) return set.union(newSet);
        else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
    }
);

// TODO Documentation
Native.addNativeFunction(SET_NATIVE_TYPE_NAME, [], [ new Alias("intersection", "eng") ], [], [ new Bind([], undefined, [ new Alias("set", "eng") ] ) ], new SetType(undefined, undefined, new NameType(SET_TYPE_VAR_NAME)),
    evaluation => {
        const set = evaluation.getContext();
        const newSet = evaluation.resolve("set");
        if(set instanceof SetValue && newSet instanceof SetValue) return set.intersection(newSet);
        else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
    }
);

// TODO Documentation
Native.addNativeFunction(SET_NATIVE_TYPE_NAME, [], [ new Alias("difference", "eng") ], [], [ new Bind([], undefined, [ new Alias("set", "eng") ] ) ], new SetType(undefined, undefined, new NameType(SET_TYPE_VAR_NAME)),
    evaluation => {
        const set = evaluation.getContext();
        const newSet = evaluation.resolve("set");
        if(set instanceof SetValue && newSet instanceof SetValue) return set.difference(newSet);
        else return new TypeException(evaluation.getEvaluator(), new SetType(), set);
    }
);

// TODO Documentation
const setFilterHOFType = new FunctionType([ 
    new Bind(
        [],
        undefined,
        [ new Alias("value", "eng") ],
        new BooleanType()
    )
], new NameType(SET_TYPE_VAR_NAME));

Native.addFunction(SET_NATIVE_TYPE_NAME, new FunctionDefinition(
    [], 
    [ new Alias("filter", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("checker", "eng")], setFilterHOFType)
    ],
    new NativeHOFSetFilter(setFilterHOFType),
    new SetType(undefined, undefined, new NameType(SET_TYPE_VAR_NAME))
));

// TODO Documentation
Native.addNativeFunction(MAP_NATIVE_TYPE_NAME, [], [ new Alias("set", "eng") ], [], 
    [ 
        new Bind([], undefined, [ new Alias("key", "eng") ], new NameType("K") ),
        new Bind([], undefined, [ new Alias("value", "eng") ], new NameType("V") )
    ],
    new MapType(),
    evaluation => {
        const map = evaluation.getContext();
        const key = evaluation.resolve("key");
        const value = evaluation.resolve("value");
        if(map instanceof MapValue && key !== undefined && value !== undefined) return map.set(key, value);
        else return new TypeException(evaluation.getEvaluator(), new MapType(), map);
    }
);

// TODO Documentation
Native.addNativeFunction(MAP_NATIVE_TYPE_NAME, [], [ new Alias("unset", "eng") ], [], 
    [ 
        new Bind([], undefined, [ new Alias("key", "eng") ], new NameType("K") )
    ],
    new MapType(),
    evaluation => {
        const map = evaluation.getContext();
        const key = evaluation.resolve("key");
        if(map instanceof MapValue && key !== undefined) return map.unset(key);
        else return new TypeException(evaluation.getEvaluator(), new MapType(), map);
    }
);

// TODO Documentation
Native.addNativeFunction(MAP_NATIVE_TYPE_NAME, [], [ new Alias("remove", "eng") ], [], 
    [ 
        new Bind([], undefined, [ new Alias("value", "eng") ], new NameType("V") )
    ],
    new MapType(),
    evaluation => {
        const map = evaluation.getContext();
        const value = evaluation.resolve("value");
        if(map instanceof MapValue && value !== undefined) return map.remove(value);
        else return new TypeException(evaluation.getEvaluator(), new MapType(), map);
    }
);

// TODO Documentation
const mapFilterHOFType = new FunctionType([ 
    new Bind(
        [],
        undefined,
        [ new Alias("key", "eng") ],
        new NameType(MAP_KEY_TYPE_VAR_NAME)
    ),
    new Bind(
        [],
        undefined,
        [ new Alias("value", "eng") ],
        new NameType(MAP_VALUE_TYPE_VAR_NAME)
    )
], new BooleanType());

Native.addFunction(MAP_NATIVE_TYPE_NAME, new FunctionDefinition(
    [], 
    [ new Alias("filter", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("checker", "eng")], mapFilterHOFType)
    ],
    new NativeHOFMapFilter(mapFilterHOFType),
    new MapType(undefined, undefined, new NameType(MAP_KEY_TYPE_VAR_NAME), undefined, new NameType(MAP_VALUE_TYPE_VAR_NAME))
));

// TODO Documentation
const mapTranslateHOFType = new FunctionType([ 
    new Bind(
        [],
        undefined,
        [ new Alias("key", "eng") ],
        new NameType(MAP_KEY_TYPE_VAR_NAME)
    ),
    new Bind(
        [],
        undefined,
        [ new Alias("value", "eng") ],
        new NameType(MAP_VALUE_TYPE_VAR_NAME)
    )
], new NameType(MAP_VALUE_TYPE_VAR_NAME));

Native.addFunction(MAP_NATIVE_TYPE_NAME, new FunctionDefinition(
    [], 
    [ new Alias("translate", "eng") ], 
    [], 
    [
        new Bind([], undefined, [ new Alias("translator", "eng")], mapTranslateHOFType)
    ],
    new NativeHOFMapTranslate(mapTranslateHOFType),
    new MapType(undefined, undefined, new NameType(MAP_KEY_TYPE_VAR_NAME), undefined, new NameType(MAP_VALUE_TYPE_VAR_NAME))
));

// LIST conversions
Native.addConversion(LIST_NATIVE_TYPE_NAME, [],  "[]", "''", (val: List) => new Text(val.toString())),
Native.addConversion(LIST_NATIVE_TYPE_NAME, [],  "[]", "{}", (val: List) => new SetValue(val.getValues())),

// SET conversions
Native.addConversion(SET_NATIVE_TYPE_NAME, [], "{}", "''", (val: SetValue) => new Text(val.toString()));
Native.addConversion(SET_NATIVE_TYPE_NAME, [], "{}", "[]", (val: SetValue) => new List(val.values));

// MAP conversions
Native.addConversion(MAP_NATIVE_TYPE_NAME, [], "{:}", "''", (val: MapValue) => new Text(val.toString()));
Native.addConversion(MAP_NATIVE_TYPE_NAME, [], "{:}", "{}", (val: MapValue) => new SetValue(val.getKeys()));
Native.addConversion(MAP_NATIVE_TYPE_NAME, [], "{:}", "[]", (val: MapValue) => new List(val.getValues()));

// BOOLEAN conversions
Native.addConversion(BOOLEAN_NATIVE_TYPE_NAME, [], "?", "''", (val: Bool) => new Text(val.toString()));

// NONE conversions
Native.addConversion(NONE_NATIVE_TYPE_NME, [], "!", "''", (val: None) => new Text(val.toString()));

// TEXT conversions
Native.addConversion(TEXT_NATIVE_TYPE_NAME, [], '""', '[""]', (val: Text) => new List(val.text.split("").map(c => new Text(c))));
Native.addConversion(TEXT_NATIVE_TYPE_NAME, [], '""', "#", (val: Text) => new Measurement(val.text));

// MEASUREMENT conversions

// Time
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#', "''", (val: Measurement) => new Text(val.toString()));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#s', "#min", (val: Measurement) => val.divide(new Measurement(60, new Unit(["s"], ["min"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#s', "#h", (val: Measurement) => val.divide(new Measurement(3600, new Unit(["s"], ["h"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#s', "#day", (val: Measurement) => val.divide(new Measurement(86400, new Unit(["s"], ["day"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#s', "#wk", (val: Measurement) => val.divide(new Measurement(604800, new Unit(["s"], ["wk"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#s', "#yr", (val: Measurement) => val.divide(new Measurement(31449600, new Unit(["s"], ["yr"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#min', "#s", (val: Measurement) => val.multiply(new Measurement(60, new Unit(["s"], ["min"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#h', "#s", (val: Measurement) => val.multiply(new Measurement(3600, new Unit(["s"], ["h"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#day', "#s", (val: Measurement) => val.multiply(new Measurement(86400, new Unit(["s"], ["day"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#wk', "#s", (val: Measurement) => val.multiply(new Measurement(604800, new Unit(["s"], ["wk"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#yr', "#s", (val: Measurement) => val.multiply(new Measurement(31449600, new Unit(["s"], ["yr"]))));

// Distance
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#pm", (val: Measurement) => val.multiply(new Measurement(1000000000000, new Unit(["pm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#nm", (val: Measurement) => val.multiply(new Measurement(1000000000, new Unit(["nm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#µm", (val: Measurement) => val.multiply(new Measurement(1000000, new Unit(["µm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#mm", (val: Measurement) => val.multiply(new Measurement(1000, new Unit(["mm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#cm", (val: Measurement) => val.multiply(new Measurement(100, new Unit(["cm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#dm", (val: Measurement) => val.multiply(new Measurement(10, new Unit(["dm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#km", (val: Measurement) => val.divide(new Measurement(1000, new Unit(["m"], ["km"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#Mm", (val: Measurement) => val.divide(new Measurement(1000000, new Unit(["m"], ["Mm"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#Gm", (val: Measurement) => val.divide(new Measurement(1000000000, new Unit(["m"], ["Gm"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#Tm", (val: Measurement) => val.divide(new Measurement(1000000000000, new Unit(["m"], ["Tm"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#pm', "#m", (val: Measurement) => val.divide(new Measurement(1000000000000, new Unit(["pm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#nm', "#m", (val: Measurement) => val.divide(new Measurement(1000000000, new Unit(["nm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#µm', "#m", (val: Measurement) => val.divide(new Measurement(1000000, new Unit(["µm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#mm', "#m", (val: Measurement) => val.divide(new Measurement(1000, new Unit(["mm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#cm', "#m", (val: Measurement) => val.divide(new Measurement(100, new Unit(["cm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#dm', "#m", (val: Measurement) => val.divide(new Measurement(10, new Unit(["dm"], ["m"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#km', "#m", (val: Measurement) => val.multiply(new Measurement(1000, new Unit(["m"], ["km"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#Mm', "#m", (val: Measurement) => val.multiply(new Measurement(1000000, new Unit(["m"], ["Mm"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#Gm', "#m", (val: Measurement) => val.multiply(new Measurement(1000000000, new Unit(["m"], ["Gm"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#Tm', "#mT", (val: Measurement) => val.divide(new Measurement(1000000000000, new Unit(["m"], ["Tm"]))));

// Imperial conversions
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#km', "#mi", (val: Measurement) => val.multiply(new Measurement(0.621371, new Unit(["mi"], ["km"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#mi', "#km", (val: Measurement) => val.divide(new Measurement(0.621371, new Unit(["mi"], ["km"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#cm', "#in", (val: Measurement) => val.multiply(new Measurement(0.393701, new Unit(["in"], ["cm"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#in', "#cm", (val: Measurement) => val.divide(new Measurement(0.393701, new Unit(["in"], ["cm"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#m', "#ft", (val: Measurement) => val.multiply(new Measurement(0.3048, new Unit(["ft"], ["km"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#ft', "#m", (val: Measurement) => val.divide(new Measurement(0.3048, new Unit(["ft"], ["km"]))));
1
// Weight
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#g', "#mg", (val: Measurement) => val.multiply(new Measurement(1000, new Unit(["mg"], ["g"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#mg', "#g", (val: Measurement) => val.divide(new Measurement(1000, new Unit(["mg"], ["g"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#g', "#kg", (val: Measurement) => val.divide(new Measurement(1000, new Unit(["g"], ["kg"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#kg', "#g", (val: Measurement) => val.multiply(new Measurement(1000, new Unit(["g"], ["kg"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#g', "#oz", (val: Measurement) => val.multiply(new Measurement(0.035274, new Unit(["oz"], ["g"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#oz', "#g", (val: Measurement) => val.divide(new Measurement(0.035274, new Unit(["oz"], ["g"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#oz', "#lb", (val: Measurement) => val.multiply(new Measurement(0.0625, new Unit(["lb"], ["oz"]))));
Native.addConversion(MEASUREMENT_NATIVE_TYPE_NAME, [], '#lb', "#oz", (val: Measurement) => val.divide(new Measurement(0.0625, new Unit(["lb"], ["oz"]))));

Native.addStructure(LIST_NATIVE_TYPE_NAME, new StructureDefinition(
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
    new Block([], [ ...Object.values(Native.functionsByType[LIST_NATIVE_TYPE_NAME] ?? {}), ...Native.conversionsByType[LIST_NATIVE_TYPE_NAME]], false, true)
));

Native.addStructure(SET_NATIVE_TYPE_NAME, new StructureDefinition(
    // TODO Localized documentation
    [],
    [],
    // No interfaces
    [],
    // One type variable
    [ new TypeVariable(SET_TYPE_VAR_NAME)],
    // No inputs
    [],
    // Include all of the functions defined above.
    new Block([], [ ...Object.values(Native.functionsByType[SET_NATIVE_TYPE_NAME] ?? {}), ...Native.conversionsByType[SET_NATIVE_TYPE_NAME]], false, true)
));

Native.addStructure(MAP_NATIVE_TYPE_NAME, new StructureDefinition(
    // TODO Localized documentation
    [],
    [],
    // No interfaces
    [],
    // One type variable
    [ new TypeVariable(MAP_KEY_TYPE_VAR_NAME), new TypeVariable(MAP_VALUE_TYPE_VAR_NAME)],
    // No inputs
    [],
    // Include all of the functions defined above.
    new Block([], [ ...Object.values(Native.functionsByType[MAP_NATIVE_TYPE_NAME] ?? {}), ...Native.conversionsByType[MAP_NATIVE_TYPE_NAME]], false, true)
));

Native.addStructure(BOOLEAN_NATIVE_TYPE_NAME, new StructureDefinition(
    // TODO Localized documentation
    [],[], [], [], [],
    new Block([], [ ...Object.values(Native.functionsByType[BOOLEAN_NATIVE_TYPE_NAME] ?? {}), ...Native.conversionsByType[BOOLEAN_NATIVE_TYPE_NAME]], false, true)
));

Native.addStructure(MEASUREMENT_NATIVE_TYPE_NAME, new StructureDefinition(
    // TODO Localized documentation
    [],[], [], [], [],
    new Block([], [ ...Object.values(Native.functionsByType[MEASUREMENT_NATIVE_TYPE_NAME] ?? {}), ...Native.conversionsByType[MEASUREMENT_NATIVE_TYPE_NAME]], false, true)
));

Native.addStructure(TEXT_NATIVE_TYPE_NAME, new StructureDefinition(
    // TODO Localized documentation
    [],[], [], [], [],
    new Block([], [ ...Object.values(Native.functionsByType[TEXT_NATIVE_TYPE_NAME] ?? {}), ...Native.conversionsByType[TEXT_NATIVE_TYPE_NAME]], false, true)
));

Native.addStructure(NONE_NATIVE_TYPE_NME, new StructureDefinition(
    // TODO Localized documentation
    [],[], [], [], [],
    new Block([], [ ...Object.values(Native.functionsByType[NONE_NATIVE_TYPE_NME] ?? {}), ...Native.conversionsByType[NONE_NATIVE_TYPE_NME]], false, true)
));

export default Native;