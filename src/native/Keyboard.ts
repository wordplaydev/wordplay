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

function createKey(evaluator: Evaluator, key: string, down: boolean) {
    return createStructure(evaluator, Key, { key: new Text(key), down: new Bool(down) })
}

export default class Keyboard extends Stream {

    readonly evaluator: Evaluator;

    constructor(evaluator: Evaluator) {
        super(
            {
                eng: "A stream of key up and down events.",
                "😀": TRANSLATE
            }, 
            {
                eng: "keyboard",
                "😀": "⌨️"
            }, 
            evaluator, 
            new None()
        );
        
        this.evaluator = evaluator;
    }

    record(key: string, down: boolean) {
        this.add(createKey(this.evaluator, key, down));
    }

    start() {}
    stop() {}

    getType() { return new StreamType(new StructureType(Key)); }

}