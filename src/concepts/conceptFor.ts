import BindConcept from '@concepts/BindConcept';
import type Concept from '@concepts/Concept';
import FunctionConcept from '@concepts/FunctionConcept';
import type { PurposeType } from '@concepts/Purpose';
import StructureConcept from '@concepts/StructureConcept';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';

/**
 * The concept that documents one creator-written definition, or `undefined` for anything
 * that isn't one. One place rather than two, so the project's concept index and a kit's
 * page cannot disagree about how a definition is documented.
 */
export default function conceptFor(
    def: unknown,
    purpose: PurposeType,
    locales: Locales,
    context: Context,
): Concept | undefined {
    if (def instanceof StructureDefinition)
        return new StructureConcept(
            purpose,
            undefined,
            def,
            undefined,
            [],
            locales,
            context,
        );
    if (def instanceof FunctionDefinition)
        return new FunctionConcept(
            purpose,
            undefined,
            def,
            undefined,
            locales,
            context,
        );
    if (def instanceof Bind)
        return new BindConcept(purpose, def, locales, context);
    return undefined;
}
