import Stream from "./Stream";
import type Value from "./Value";
import StructureDefinitionValue from "./StructureDefinitionValue";
import Verse from "../native/Verse";
import Phrase from "../native/Phrase";
import Group from "../native/Group";
import type StructureDefinition from "../nodes/StructureDefinition";
import type Evaluator from "./Evaluator";
import Layout, { Vertical } from "../native/Layout";
import Transition, { Fade, Scale } from "../native/Transition";
import Animation, { Bounce, Throb, Wobble } from "../native/Animation";
import Style from "../native/Style";
import type Definition from "../nodes/Definition";
import Tree from "../nodes/Tree";
import type Names from "../nodes/Names";

export const DefaultStructures = [
    Verse,
    Phrase,
    Style,
    Group,
    Vertical,
    Layout,
    Transition,
    Fade,
    Scale,
    Animation,
    Wobble,
    Throb,
    Bounce
];

export const DefaultTrees = DefaultStructures.map(def => new Tree(def));

export default class Shares {

    readonly _valuesIndex: Map<string, Value> = new Map();
    readonly values: Set<Value> = new Set();
    readonly defaults: Record<string, StructureDefinitionValue | Stream> = {}
    readonly evaluator: Evaluator;
    readonly streams: Set<Stream> = new Set();

    constructor(evaluator: Evaluator) {

        this.evaluator = evaluator;

        // Add the default structure definitions.
        DefaultStructures.forEach(def => this.addStructureDefinition(def));
        
    }

    // Adds the list of streams to the shares. Most commonly called when Evaluation starts. 
    addStreams(streams: Stream[]) {

        for(const stream of streams) {
            if(!this.streams.has(stream)) {
                this.bind(stream.names, stream);
                this.streams.add(stream);
            }
        }

    }

    addStructureDefinition(def: StructureDefinition) {

        const val = new StructureDefinitionValue(this.evaluator.getProgram(), def);
        this.bind(def.names, val);
        for(const name of def.getNames())
            this.defaults[name] = val;

    }

    getDefaultShares() { 
        return this.defaults;
    }

    getDefinitions() { 
        return  Array.from(this.values)
                .filter(v => v instanceof StructureDefinitionValue || v instanceof Stream)
                .map(v => v instanceof StructureDefinitionValue ? v.definition : v) as (Stream | StructureDefinition)[] 
    }

    getAllStructureDefinitions() { 
        return  (Array.from(this.values)
                .filter(v => v instanceof StructureDefinitionValue) as StructureDefinitionValue[])
                .map(v => v.definition) as StructureDefinition[]
    }

    getStreams(): Stream[] {
        return Array.from(this.values).filter(v => v instanceof Stream) as Stream[];
    }

    bind(names: Names, value: Value): undefined {
        // Add the value to the set
        this.values.add(value);
        // Add the value's names to the index for quicker retrieval.
        for(const name of names.getNames())
            this._valuesIndex.set(name, value);
        return undefined;
    }

    /** TODO: Handle version. */
    resolve(name: string): Value | undefined {
        return this._valuesIndex.get(name);
    }

    getDefaultDefinition(name: string): Definition | undefined {
        const def = this.defaults[name];
        return def instanceof StructureDefinitionValue ? def.definition : undefined;
    }
    
}