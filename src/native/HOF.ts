import type Bind from "../nodes/Bind";
import type Context from "../nodes/Context";
import Expression from "../nodes/Expression";
import FunctionDefinition from "../nodes/FunctionDefinition";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import type TypeSet from "../nodes/TypeSet";

export default abstract class HOF extends Expression {

    getGrammar() { return []; }

    computeConflicts() {}
    
    // We don't clone these, we just erase their parent, since there's only one of them.
    clone() { return this; }
    
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { context; bind; original; return current; }

    getDependencies(context: Context): Expression[] {
        // Higher order functions expressions depend on the inputs of their FunctionDefinitions.
        const parent = context.get(this)?.getParent();
        return parent instanceof FunctionDefinition ? parent.inputs : [];
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A higher order function"
        }
    }

    
    

    getStart() { return this; }
    getFinish() { return this; }

}

