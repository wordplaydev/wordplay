import type Context from "./Context";
import Type from "./Type";
import type Node from "./Node";
import type Definition from "./Definition";

export default abstract class NativeType extends Type {

    constructor() {
        super();
    }

    /** Override the base class: native type scopes are their native structure definitions. */
    getScope(context: Context): Node | undefined {
        return context.native.getStructureDefinition(this.getNativeTypeName());
    }

    /**
     * Get the in the native structure definitions.
     */
    getDefinitions(_: Node, context: Context): Definition[] { 
        return context.native.getStructureDefinition(this.getNativeTypeName())?.getDefinitions(this) ?? []; 
    }
    
}