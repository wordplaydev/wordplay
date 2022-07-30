import Exception, { ExceptionType } from "./Exception";
import Stream from "./Stream";
import type Value from "./Value";
import Time from "../native/Time";
import StructureDefinitionValue from "./StructureDefinitionValue";
import Verse from "../native/Verse";
import Sentence from "../native/Sentence";
import Group from "../native/Group";
import MouseButton from "../native/MouseButton";

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
        
    }

    getStreams(): Stream[] {
        return Array.from(this.values.values()).filter(v => v instanceof Stream) as Stream[];
    }

    getMouseButton(): MouseButton { return this.mouseButton; }

    bind(name: string, value: Value): Exception | undefined {
        if(this.values.has(name)) 
            return new Exception(ExceptionType.EXISTING_SHARE);
        this.values.set(name, value);
    }

    resolve(name: string, version?: number): Value {
        return this.values.has(name) ? this.values.get(name) as Value : new Exception(ExceptionType.UNKNOWN_SHARE);
    }

}