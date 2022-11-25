import Bool from "../runtime/Bool";
import Text from "../runtime/Text";
import Stream from "../runtime/Stream";
import Key from "./Key";
import { createStructure } from "../runtime/Structure";
import None from "../runtime/None";
import StructureType from "../nodes/StructureType";
import StreamType from "../nodes/StreamType";
import { TRANSLATE } from "../nodes/Translations";
import type Value from "../runtime/Value";
import type Names from "../nodes/Names";
import type Evaluator from "../runtime/Evaluator";

export default class Keyboard extends Stream {

    readonly evaluator: Evaluator;
    on: boolean = false;

    constructor(evaluator: Evaluator) {
        super(
            evaluator.getProgram(),
            {
                eng: "A stream of key up and down events.",
                "😀": `${TRANSLATE}`
            }, 
            {
                eng: "keyboard",
                "😀": "⌨️"
            }, 
            new None(evaluator.getProgram())
        );

        this.evaluator = evaluator;
        
    }

    record(key: string, down: boolean) {
        if(this.on) {
            const bindings = new Map<Names, Value>();
            bindings.set(Key.inputs[0].names, new Text(this.creator, key));
            bindings.set(Key.inputs[1].names, new Bool(this.creator, down));
            this.add(createStructure(this.evaluator, Key, bindings));
        }
    }
    
    start() { this.on = true; }
    stop() { this.on = false; }

    getType() { return new StreamType(new StructureType(Key)); }

}