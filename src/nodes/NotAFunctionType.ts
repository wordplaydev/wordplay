import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations";
import type Convert from "./Convert";
import Evaluate from "./Evaluate";


export default class NotAFunctionType extends UnknownType<Evaluate | Convert> {

    constructor(evaluate: Evaluate | Convert, why: Type | undefined) {
        super(evaluate, why);
    }

    getReason(): Translations {
        return {
            "😀": TRANSLATE,
            eng: `${(this.expression instanceof Evaluate ? this.expression.func : this.expression).toWordplay()} is not a function`
        };
    }

}
