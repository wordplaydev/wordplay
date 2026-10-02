import type Context from '#nodes/Context.ts';
import type FunctionDefinition from '#nodes/FunctionDefinition.ts';
import type Node from '#nodes/Node.ts';
import PropertyReference from '#nodes/PropertyReference.ts';
import Reference from '#nodes/Reference.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import { COMMA_SYMBOL } from '#parser/Symbols.ts';
import type Locales from '#locale/Locales.ts';
import { Emotion } from '../lore/Emotion';
import type Markup from '#nodes/Markup.ts';
import type { CharacterName } from '../tutorial/Tutorial';
import BindConcept from '#concepts/BindConcept.ts';
import Concept from '#concepts/Concept.ts';
import type { PurposeType } from '#concepts/Purpose.ts';
import type StructureConcept from '#concepts/StructureConcept.ts';

export default class FunctionConcept extends Concept {
    /** The function this concept represents. */
    readonly definition: FunctionDefinition;

    /** The structure concept on which this function is defined, if any */
    readonly structure: StructureConcept | undefined;

    /** The structure this is a static function of, if any. Kept so the textual
     *  example can rebuild the `Structure.fn` subject non-symbolically. */
    private readonly staticOwner: StructureDefinition | undefined;

    /** A derived example (symbolic names). */
    readonly example: Node;

    /** A lazily-built example preferring textual names (see getRepresentation). */
    private exampleTextual: Node | undefined;

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
        this.staticOwner = staticOwner;

        this.example = this.definition.getEvaluateTemplate(
            locales,
            context,
            false,
            true,
            this.makeSubject(locales, true),
        );

        this.inputs = this.definition.inputs.map(
            (bind) => new BindConcept(purpose, bind, locales, context),
        );
    }

    /**
     * The call subject. Static functions are called on the structure itself, so
     * use a `Structure.fn` property reference. A bare Reference would render
     * `Structure(...)`, and the structure type would render a call on an
     * instance placeholder.
     */
    private makeSubject(locales: Locales, symbolic: boolean) {
        return this.staticOwner !== undefined
            ? PropertyReference.make(
                  Reference.make(
                      locales.getName(this.staticOwner.names, symbolic),
                      this.staticOwner,
                  ),
                  Reference.make(
                      locales.getName(this.definition.names, symbolic),
                  ),
              )
            : this.structure?.type;
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
        return this.getLocalizedMarkup(
            this.definition,
            this.definition.docs,
            locales,
        );
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

    getRepresentation(locales?: Locales, textual = false) {
        if (!textual || locales === undefined) return this.example;
        // Built lazily — the textual variant is only needed by drag palettes,
        // and the concept (with this cache) is rebuilt on locale change.
        if (this.exampleTextual === undefined)
            this.exampleTextual = this.definition.getEvaluateTemplate(
                locales,
                this.context,
                false,
                false,
                this.makeSubject(locales, false),
            );
        return this.exampleTextual;
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
