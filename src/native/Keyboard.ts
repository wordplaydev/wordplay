import Bool from "../runtime/Bool";
import Text from "../runtime/Text";
import Stream from "../runtime/Stream";
import Key from "./Key";
import { createStructure } from "../runtime/Structure";
import None from "../runtime/None";
import type Evaluator from "../runtime/Evaluator";
import StructureType from "../nodes/StructureType";
import StreamType from "../nodes/StreamType";
import { TRANSLATE } from "../nodes/Translations";
import type Value from "../runtime/Value";
import type Names from "../nodes/Names";

export default class Keyboard extends Stream {

    readonly evaluator: Evaluator;

    constructor(evaluator: Evaluator) {
        super(
            evaluator.getProgram(),
            {
                eng: "A stream of key up and down events.",
                "😀": `${TRANSLATE}1`
            }, 
            {
                eng: "keyboard",
                "😀": "⌨️"
            }, 
            evaluator, 
            new None(evaluator.getProgram())
        );
        
        this.evaluator = evaluator;
    }

    record(key: string, down: boolean) {
        const bindings = new Map<Names, Value>();
        bindings.set(Key.inputs[0].names, new Text(this.evaluator.getProgram(), key));
        bindings.set(Key.inputs[1].names, new Bool(this.evaluator.getProgram(), down));
        this.add(createStructure(this.evaluator, Key, bindings));
    }
    
    start() {}
    stop() {}

    getType() { return new StreamType(new StructureType(Key)); }

}