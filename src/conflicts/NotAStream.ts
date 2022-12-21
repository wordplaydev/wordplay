import type Context from "../nodes/Context";
import type Previous from "../nodes/Previous";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import Conflict from "./Conflict";


export class NotAStream extends Conflict {

    readonly stream: Previous;
    readonly received: Type;

    constructor(stream: Previous, received: Type) {
        super(false);

        this.stream = stream;
        this.received = received;

    }

    getConflictingNodes() {
        return { primary: [ this.stream.stream ] };
    }

    getExplanations(context: Context): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This has to be a stream, but it's a ${this.received.getDescriptions(context).eng}`
        }
    }

}
