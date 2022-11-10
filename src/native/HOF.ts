import type Bind from "../nodes/Bind";
import type Context from "../nodes/Context";
import Expression from "../nodes/Expression";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type { TypeSet } from "../nodes/UnionType";

export default abstract class HOF extends Expression {

    getGrammar() { return []; }

    computeConflicts() {}
    
    clone(): this { return this; }
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { context; bind; original; return current; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A higher order function"
        }
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }
}

