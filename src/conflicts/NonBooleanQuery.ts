import type Context from "../nodes/Context";
import type Delete from "../nodes/Delete";
import type Select from "../nodes/Select";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type Type from "../nodes/Type";
import type Update from "../nodes/Update";
import Conflict from "./Conflict";


export default class NonBooleanQuery extends Conflict {
    readonly op: Select | Delete | Update;
    readonly type: Type;

    constructor(op: Select | Delete | Update, type: Type) {
        super(false);

        this.op = op;
        this.type = type;

    }

    getConflictingNodes() {
        return { primary: [ this.op.query ] };
    }

    getExplanations(context: Context): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `Table queries have to be Boolean-typed; this is ${this.type.getDescriptions(context).eng}`
        }
    }

}
