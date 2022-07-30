import Bool from "../runtime/Bool";
import Text from "../runtime/Text";
import Stream from "../runtime/Stream";
import Key from "./Key";
import { createStructure } from "../runtime/Structure";
import None from "../runtime/None";

function createKey(key: string, down: boolean) {
    return createStructure(Key, { key: new Text(key), down: new Bool(down) })
}

export default class Keyboard extends Stream {

    constructor() {
        super({"eng": "⌨️"}, new None([]));
    }

    record(key: string, down: boolean) {
        this.add(createKey(key, down));
    }

    start() {}
    stop() {}

    getType() { return Key; }

}