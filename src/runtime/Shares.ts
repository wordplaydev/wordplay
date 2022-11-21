import Stream from "./Stream";
import type Value from "./Value";
import Time from "../native/Time";
import StructureDefinitionValue from "./StructureDefinitionValue";
import Verse from "../native/Verse";
import Phrase from "../native/Phrase";
import Group from "../native/Group";
import MouseButton from "../native/MouseButton";
import MousePosition from "../native/MousePosition";
import Keyboard from "../native/Keyboard";
import type StructureDefinition from "../nodes/StructureDefinition";
import type Evaluator from "./Evaluator";
import Layout, { Vertical } from "../native/Layout";
import Microphone from "../native/Microphone";
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
    readonly time: Time;
    readonly mouseButton: MouseButton;
    readonly mousePosition: MousePosition;
    readonly keyboard: Keyboard;
    readonly microphone: Microphone;

    constructor(evaluator: Evaluator) {

        this.evaluator = evaluator;

        // Add the default structure definitions.
        DefaultStructures.forEach(def => this.addStructureDefinition(def));

        // Share a timer stream for programs to listen to.
        this.time = new Time(evaluator);
        this.bind(this.time.names, this.time);

        // Share a mouse button stream for programs to listen to.
        this.mouseButton = new MouseButton(evaluator);
        this.bind(this.mouseButton.names, this.mouseButton);

        // Share a mouse position stream for programs to listen to.
        this.mousePosition = new MousePosition(evaluator);
        this.bind(this.mousePosition.names, this.mousePosition);
        
        // Share a keyboard button stream for programs to listen to.
        this.keyboard = new Keyboard(evaluator);
        this.bind(this.keyboard.names, this.keyboard);

        // Share the microphone.
        this.microphone = new Microphone(evaluator);
        this.bind(this.microphone.names, this.microphone);
        
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

    getMouseButton(): MouseButton { return this.mouseButton; }
    getMousePosition(): MousePosition { return this.mousePosition; }
    getKeyboard(): Keyboard { return this.keyboard; }

    bind(names: Names, value: Value): undefined {
        // Add the value to the set
        this.values.add(value);
        // Add the value's names to the index for quicker retrieval.
        for(const name of names.getNames())
            this._valuesIndex.set(name, value);
        return undefined;
    }

    /** Handle version. */
    resolve(name: string): Value | undefined {
        return this._valuesIndex.get(name);
    }

    /** Handle version. */
    getDefaultDefinition(name: string): Definition | undefined {
        const def = this.defaults[name];
        return def instanceof StructureDefinitionValue ? def.definition : undefined;
    }
    
}