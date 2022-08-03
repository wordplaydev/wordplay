import Exception, { ExceptionType } from "./Exception";
import Stream from "./Stream";
import type Value from "./Value";
import Time from "../native/Time";
import StructureDefinitionValue from "./StructureDefinitionValue";
import Verse from "../native/Verse";
import Sentence from "../native/Sentence";
import Group from "../native/Group";
import MouseButton from "../native/MouseButton";
import MousePosition from "../native/MousePosition";
import Keyboard from "../native/Keyboard";

export const DEFAULT_SHARES: Record<string, Value> = {
    // Add the output types as implicit shares.
    "V": new StructureDefinitionValue(Verse),
    "G": new StructureDefinitionValue(Group),
    "W": new StructureDefinitionValue(Sentence)
}

export default class Shares {

    readonly values: Map<string, Value>;

    readonly time: Time;
    readonly mouseButton: MouseButton;
    readonly mousePosition: MousePosition;
    readonly keyboard: Keyboard;

    constructor(bindings?: Record<string, Value>) {

        this.values = new Map();

        if(bindings)
            Object.keys(bindings).forEach(name => this.bind(name, bindings[name]));

        // Add implicit shares.
        Object.keys(DEFAULT_SHARES).forEach(name => this.bind(name, DEFAULT_SHARES[name]));

        // Share a timer stream for programs to listen to.
        this.time = new Time();
        Object.values(this.time.getNames()).forEach(name => this.bind(name, this.time));

        // Share a mouse button stream for programs to listen to.
        this.mouseButton = new MouseButton();
        Object.values(this.mouseButton.getNames()).forEach(name => this.bind(name, this.mouseButton));

        // Share a mouse position stream for programs to listen to.
        this.mousePosition = new MousePosition();
        Object.values(this.mousePosition.getNames()).forEach(name => this.bind(name, this.mousePosition));
        
        // Share a keyboard button stream for programs to listen to.
        this.keyboard = new Keyboard();
        Object.values(this.keyboard.getNames()).forEach(name => this.bind(name, this.keyboard));

    }

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
    resolve(name: string, version?: number): Value | undefined {
        return this.values.has(name) ? this.values.get(name) as Value : undefined;
    }

}