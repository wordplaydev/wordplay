import type Context from "./Context";
import Type from "./Type";
import type Node from "./Node";
import type Definition from "./Definition";

export default abstract class NativeType extends Type {

    constructor() {
        super();
    }

    getDefinitions(node: Node, context: Context): Definition[] {
        
        return context.native.getStructureDefinition(this.getNativeTypeName())?.getDefinitions(node) ?? []; 

    }

}