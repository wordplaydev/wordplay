import { Purpose } from '@concepts/Purpose';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import type Node from '@nodes/Node';
import Type from '@nodes/Type';

export default abstract class BasisType extends Type {
    constructor() {
        super();
    }

    getPurpose() {
        return Purpose.Types;
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
                context,
            ) ?? []),
        ];
    }
}
