import type Context from "./Context";
import Type from "./Type";
import type Node from "./Node";

export default abstract class NativeType extends Type {

    constructor() {
        super();
    }

    /** Override the base class: native type scopes are their native structure definitions. */
    getScope(context: Context): Node | undefined {
        return context.native.getStructureDefinition(this.getNativeTypeName());
    }

}