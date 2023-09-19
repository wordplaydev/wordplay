import type Context from './Context';
import Type from './Type';
import type Node from './Node';
import type Definition from './Definition';

export default abstract class BasisType extends Type {
    constructor() {
        super();
    }

    /** Override the base class: instead of asking parent for scope (since there is no parent), basis type scopes are their basis structure definitions. */
    getScope(context: Context): Node | undefined {
        return context
            .getBasis()
            .getStructureDefinition(this.getBasisTypeName());
    }

    /** All types have the structure type's functions. */
    getAdditionalBasisScope(context: Context): Node | undefined {
        return context.getBasis().getStructureDefinition('structure');
    }

    /**
     * Get basis functions and the structure type functions.
     */
    getDefinitions(_: Node, context: Context): Definition[] {
        return [
            // Get the functions defined on the base type
            ...(context
                .getBasis()
                .getStructureDefinition(this.getBasisTypeName())
                ?.getDefinitions(this) ?? []),
            // Include the basis scope functions
            ...(this.getAdditionalBasisScope(context)?.getDefinitions(
                _,
                context
            ) ?? []),
        ];
    }
}
