import type Context from "./Context";
import Type from "./Type";
import type Node from "./Node";

export default abstract class MeasurementType extends Type {

    constructor() {
        super();
    }

    getDefinitionOfName(name: string, context: Context, node: Node) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinitionOfName(name, context, node); 
    }

}