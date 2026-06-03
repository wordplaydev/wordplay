import type Context from '@nodes/Context';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Node from '@nodes/Node';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import type StructureDefinition from '@nodes/StructureDefinition';
import { COMMA_SYMBOL } from '@parser/Symbols';
import type Locales from '@locale/Locales';
import { Emotion } from '../lore/Emotion';
import type Markup from '@nodes/Markup';
import type { CharacterName } from '../tutorial/Tutorial';
import BindConcept from '@concepts/BindConcept';
import Concept from '@concepts/Concept';
import type { PurposeType } from '@concepts/Purpose';
import type StructureConcept from '@concepts/StructureConcept';

export default class FunctionConcept extends Concept {
    /** The function this concept represents. */
    readonly definition: FunctionDefinition;

    /** The structure concept on which this function is defined, if any */
    readonly structure: StructureConcept | undefined;

    /** A derived example */
    readonly example: Node;

    /** A derived list of BindConcepts */
    readonly inputs: BindConcept[];

    constructor(
        purpose: PurposeType,
        affiliation: StructureDefinition | undefined,
        definition: FunctionDefinition,
        structure: StructureConcept | undefined,
        locales: Locales,
        context: Context,
        /** When set, this is a static function of the given structure, rendered
         *  as `Structure.fn(...)` rather than as a call on an instance. */
        staticOwner?: StructureDefinition,
    ) {
        super(purpose, affiliation, context);

        this.definition = definition;
        this.structure = structure;

        // Static functions are called on the structure itself, so use a
        // `Structure.fn` property reference as the call subject. A bare
        // Reference would render `Structure(...)`, and the structure type
        // would render a call on an instance placeholder.
        const subject =
            staticOwner !== undefined
                ? PropertyReference.make(
                      Reference.make(
                          locales.getName(staticOwner.names),
                          staticOwner,
                      ),
                      Reference.make(locales.getName(this.definition.names)),
                  )
                : this.structure?.type;

        this.example = this.definition.getEvaluateTemplate(
            locales,
            context,
            false,
            true,
            subject,
        );

        this.inputs = this.definition.inputs.map(
            (bind) => new BindConcept(purpose, bind, locales, context),
        );
    }

    getCharacter(locales: Locales) {
        return {
            symbols:
                this.definition.names.getSymbolicName() ??
                this.definition.names
                    .getLocaleNames(locales)
                    .join(COMMA_SYMBOL),
        };
    }

    getEmotion() {
        return Emotion.curious;
    }

    hasName(name: string) {
        return this.definition.names.hasName(name);
    }

    getDocs(locales: Locales): Markup[] {
        return this.definition.docs.getMarkup(locales);
    }

    getNames(_: Locales, symbolic: boolean) {
        if (symbolic) {
            const sym = this.definition.names.getSymbolicName();
            return sym ? [sym] : [];
        } else return this.definition.names.getNames();
    }

    getName(locales: Locales) {
        return locales.getName(this.definition.names, false);
    }

    getRepresentation() {
        return this.example;
    }

    getNodes(): Set<Node> {
        return new Set([this.example]);
    }

    getText(): Set<string> {
        return new Set();
    }

    getSubConcepts(): Set<Concept> {
        return new Set(this.inputs);
    }

    getCharacterName(): CharacterName | undefined {
        return undefined;
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof FunctionConcept &&
            concept.definition.isEqualTo(this.definition)
        );
    }
}
