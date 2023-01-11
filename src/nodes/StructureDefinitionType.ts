import Type from './Type';
import type ConversionDefinition from './ConversionDefinition';
import type Context from './Context';
import type StructureDefinition from './StructureDefinition';
import NameType from './NameType';
import type TypeSet from './TypeSet';
import type { NativeTypeName } from '../native/NativeConstants';
import type Definition from './Definition';
import type Node from './Node';
import type Translation from '../translation/Translation';

export const STRUCTURE_NATIVE_TYPE_NAME = 'structure';

export default class StructureDefinitionType extends Type {
    /** The structure definition that defines this type. */
    readonly structure: StructureDefinition;

    /** Any type inputs provided in creating this structure. */
    readonly types: Type[];

    constructor(definition: StructureDefinition, types: Type[]) {
        super();

        this.structure = definition;
        this.types = types;
    }

    getGrammar() {
        return [];
    }

    computeConflicts() {
        return [];
    }

    /**
     * Types have no scope beyond themselves; this is key to ensuring that autocomplete on a type only exposes
     * the names in the structure.
     */
    getScope() {
        return undefined;
    }

    getDefinition(name: string) {
        return this.structure.getDefinition(name);
    }

    getDefinitions(node: Node): Definition[] {
        return this.structure.getDefinitions(node);
    }

    /** Compatible if it's the same structure definition, or the given type is a refinement of the given structure.*/
    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every((type) => {
            // If the given type is a name type, is does it refer to this type's structure definition?
            if (type instanceof NameType) type = type.getType(context);

            if (!(type instanceof StructureDefinitionType)) return false;
            if (this.structure === type.structure) return true;
            // Are any of the given type's interfaces compatible with this?
            return (
                type.structure.interfaces.find((int) => {
                    return this.accepts(int.getType(context), context);
                }) !== undefined
            );
        });
    }

    getConversion(
        context: Context,
        input: Type,
        output: Type
    ): ConversionDefinition | undefined {
        return this.structure.getConversion(context, input, output);
    }

    getAllConversions() {
        return this.structure.getAllConversions();
    }

    resolveTypeVariable(name: string): Type | undefined {
        if (this.types.length > 0) {
            // Find the type variable corresponding to the name, then the type input corresponding to that variable.
            const variableIndex = this.structure.types?.variables.findIndex(
                (v) => v.hasName(name)
            );
            if (
                variableIndex !== undefined &&
                variableIndex < this.types.length
            )
                return this.types[variableIndex];
        }

        // Otherwise, we fail.
        return undefined;
    }

    getNativeTypeName(): NativeTypeName {
        return 'structure';
    }

    clone() {
        return this;
    }

    toWordplay() {
        return this.structure.getNames()[0];
    }

    getDescription(translation: Translation) {
        return this.structure.names.getTranslation(translation.language);
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.StructureDefinitionType;
    }
}
