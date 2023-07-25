import type Context from '@nodes/Context';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type LanguageCode from '@locale/LanguageCode';
import type Node from '@nodes/Node';
import BindConcept from './BindConcept';
import Concept from './Concept';
import type StructureConcept from './StructureConcept';
import type Locale from '@locale/Locale';
import type Purpose from './Purpose';
import type StructureDefinition from '@nodes/StructureDefinition';
import Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';

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
        languages: LanguageCode[],
        context: Context
    ) {
        super(purpose, affiliation, context);

        this.definition = definition;
        this.structure = structure;

        this.example = this.definition.getEvaluateTemplate(
            languages,
            context,
            this.structure?.type
        );

        this.inputs = this.definition.inputs.map(
            (bind) => new BindConcept(purpose, bind, languages, context)
        );
    }

    getGlyphs(languages: LanguageCode[]) {
        return {
            symbols: this.definition.names.getLocaleText(languages),
        };
    }

    getEmotion() {
        return Emotion.curious;
    }

    hasName(name: string) {
        return this.definition.names.hasName(name);
    }

    getDocs(locale: Locale): Markup | undefined {
        const doc = this.definition.docs?.getLocale(locale.language);
        return doc?.markup?.concretize(locale, []);
    }

    getName(translation: Locale) {
        return this.definition.names.getLocaleText(translation.language, false);
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

    isEqualTo(concept: Concept) {
        return (
            concept instanceof FunctionConcept &&
            concept.definition.isEqualTo(this.definition)
        );
    }
}
