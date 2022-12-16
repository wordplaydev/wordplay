import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations";
import type Select from "./Select";

export default class NotATableType extends UnknownType<Select> {

    constructor(query: Select, why: Type) {
        super(query, why);
    }

    getReason(): Translations {
        return {
            "😀": TRANSLATE,
            eng: `${this.expression.table.toWordplay()} is not a table`
        };
    }

}
