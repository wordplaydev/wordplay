import type Context from './Context';
import Type from './Type';
import type Node from './Node';
import type Definition from './Definition';

export default abstract class BasisType extends Type {
    constructor() {
        super();
    }

    /** Override the base class: basis type scopes are their basis structure definitions. */
    getScope(context: Context): Node | undefined {
        return context
            .getBasis()
            .getStructureDefinition(this.getBasisTypeName());
    }

    /**
     * Get the in the basis structure definitions.
     */
    getDefinitions(_: Node, context: Context): Definition[] {
        return (
            context
                .getBasis()
                .getStructureDefinition(this.getBasisTypeName())
                ?.getDefinitions(this) ?? []
        );
    }
}
