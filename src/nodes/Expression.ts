import Node from "./Node";
import type Context from "./Context";
import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Type from "./Type";
import type Step from "src/runtime/Step";
import UnknownType from "./UnknownType";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import type Translations from "./Translations";

export default abstract class Expression extends Node {

    /** A cache of the type computed for this epxression. Undefined means its not computed. */
    _type: Type | undefined = undefined;
    
    constructor() {
        super();
    }

    abstract computeType(context: Context): Type;

    getType(context: Context) {
        if(this._type === undefined)
            this._type = this.computeType(context);
        return this._type;
    }

    getTypeUnlessCycle(context: Context): Type {

        // If the context includes this node, we're in a cycle.
        if(context.visited(this)) return new UnknownType({ cycle: this });

        context.visit(this);
        const type = this.getType(context);
        context.unvisit();
        return type;

    }

    /** 
     * Used to determine what types are possible for a given after evalutaing this expression/ 
     * Most expressions do not manipulate possible types at all; primarily is just logical operators and type checks.
     * */
    abstract evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context): TypeSet;

    abstract compile(context: Context): Step[];
    abstract evaluate(evaluator: Evaluator): Value | undefined;

    abstract getStartExplanations(evaluator: Evaluator): Translations;
    abstract getFinishExplanations(evaluator: Evaluator): Translations;

}