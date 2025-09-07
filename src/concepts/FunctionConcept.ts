import type Context from '@nodes/Context';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type Node from '@nodes/Node';
import type StructureDefinition from '@nodes/StructureDefinition';
import { COMMA_SYMBOL } from '@parser/Symbols';
import type Locales from '../locale/Locales';
import Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';
import type { CharacterName } from '../tutorial/Tutorial';
import BindConcept from './BindConcept';
import Concept from './Concept';
import type Purpose from './Purpose';
import type StructureConcept from './StructureConcept';

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
        context: Context,
    ) {
        super(purpose, affiliation, context);

        this.definition = definition;
        this.structure = structure;

        this.example = this.definition.getEvaluateTemplate(
            locales,
            context,
            this.structure?.type,
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
        return (this.definition.docs?.docs ?? [])
            .map((doc) => doc.markup.concretize(locales, []))
            .filter((m) => m !== undefined);
    }

    getNames() {
        return this.definition.names.getNames();
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
