import type Context from '@nodes/Context';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Node from '@nodes/Node';
import BindConcept from './BindConcept';
import Concept from './Concept';
import type StructureConcept from './StructureConcept';
import type Purpose from './Purpose';
import type StructureDefinition from '@nodes/StructureDefinition';
import Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';
import type { Character } from '../tutorial/Tutorial';
import type Locales from '../locale/Locales';

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
        purpose: Purpose,
        affiliation: StructureDefinition | undefined,
        definition: FunctionDefinition,
        structure: StructureConcept | undefined,
        locales: Locales,
        context: Context
    ) {
        super(purpose, affiliation, context);

        this.definition = definition;
        this.structure = structure;

        this.example = this.definition.getEvaluateTemplate(
            locales,
            context,
            this.structure?.type
        );

        this.inputs = this.definition.inputs.map(
            (bind) => new BindConcept(purpose, bind, locales, context)
        );
    }

    getGlyphs(locales: Locales) {
        return {
            symbols: locales.getName(this.definition.names),
        };
    }

    getEmotion() {
        return Emotion.curious;
    }

    hasName(name: string) {
        return this.definition.names.hasName(name);
    }

    getDocs(locales: Locales): Markup | undefined {
        const doc = this.definition.docs?.getPreferredLocale(locales);
        return doc?.markup?.concretize(locales, []);
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

    getCharacter(): Character | undefined {
        return undefined;
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof FunctionConcept &&
            concept.definition.isEqualTo(this.definition)
        );
    }
}
