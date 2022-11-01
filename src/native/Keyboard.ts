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
        this.add(createStructure(this.evaluator, Key, { key: new Text(this.evaluator.getProgram(), key), down: new Bool(this.evaluator.getProgram(), down) }));
    }
    
    start() {}
    stop() {}

    getType() { return new StreamType(new StructureType(Key)); }

}