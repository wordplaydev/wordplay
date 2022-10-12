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
import type Definition from "../nodes/Definition";

export const DEFAULT_SHARES: Record<string, StructureDefinitionValue | Stream> = {}

function addDefaultShare(def: StructureDefinition) {
    const val = new StructureDefinitionValue(def);
    def.aliases.forEach(a => {
        const name = a.getName();
        if(name !== undefined)
            DEFAULT_SHARES[name] = val;
    });
}

addDefaultShare(Verse);
addDefaultShare(Phrase);
addDefaultShare(Group);
addDefaultShare(Vertical);
addDefaultShare(Layout);

export default class Shares {

    readonly values: Map<string, Value>;

    readonly time: Time;
    readonly mouseButton: MouseButton;
    readonly mousePosition: MousePosition;
    readonly keyboard: Keyboard;
    readonly microphone: Microphone;

    constructor(evaluator: Evaluator, bindings?: Record<string, Value>) {

        this.values = new Map();

        if(bindings)
            Object.keys(bindings).forEach(name => this.bind(name, bindings[name]));

        // Add implicit shares.
        Object.keys(DEFAULT_SHARES).forEach(name => this.bind(name, DEFAULT_SHARES[name]));

        // Share a timer stream for programs to listen to.
        this.time = new Time(evaluator);
        Object.values(this.time.getNames()).forEach(name => this.bind(name, this.time));

        // Share a mouse button stream for programs to listen to.
        this.mouseButton = new MouseButton(evaluator);
        Object.values(this.mouseButton.getNames()).forEach(name => this.bind(name, this.mouseButton));

        // Share a mouse position stream for programs to listen to.
        this.mousePosition = new MousePosition(evaluator);
        Object.values(this.mousePosition.getNames()).forEach(name => this.bind(name, this.mousePosition));
        
        // Share a keyboard button stream for programs to listen to.
        this.keyboard = new Keyboard(evaluator);
        Object.values(this.keyboard.getNames()).forEach(name => this.bind(name, this.keyboard));

        // Share the microphone.
        this.microphone = new Microphone(evaluator);
        Object.values(this.microphone.getNames()).forEach(name => this.bind(name, this.microphone));
        
    }

    getDefinitions() { 
        return  Array.from(this.values.values())
                .filter(v => v instanceof StructureDefinitionValue || v instanceof Stream)
                .map(v => v instanceof StructureDefinitionValue ? v.definition : v) as Definition[] }

    getStreams(): Stream[] {
        return Array.from(this.values.values()).filter(v => v instanceof Stream) as Stream[];
    }

    getMouseButton(): MouseButton { return this.mouseButton; }
    getMousePosition(): MousePosition { return this.mousePosition; }
    getKeyboard(): Keyboard { return this.keyboard; }

    bind(name: string, value: Value): undefined {
        this.values.set(name, value);
        return undefined;
    }

    /** Handle version. */
    resolve(name: string): Value | undefined {
        return this.values.has(name) ? this.values.get(name) as Value : undefined;
    }

}