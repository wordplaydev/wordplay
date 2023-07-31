import type StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import type Node from '@nodes/Node';
import BindConcept from './BindConcept';
import Concept from './Concept';
import FunctionConcept from './FunctionConcept';
import NameType from '@nodes/NameType';
import type Context from '@nodes/Context';
import ConversionConcept from './ConversionConcept';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import type Locale from '@locale/Locale';
import Purpose from './Purpose';
import Emotion from '../lore/Emotion';
import type Markup from '../nodes/Markup';

export default class StructureConcept extends Concept {
    /** The type this concept represents. */
    readonly definition: StructureDefinition;

    /** The type of the structure definition, enabling the creation of examples with typed placeholders */
    readonly type: Type;

    /** A list of examples for creating the structure. For basis types, likely literals, but for custom types, other useful examples. */
    readonly examples: Node[];

    /** A derived list of interfaces */
    readonly inter: StructureConcept[];

    /** A derived list of FunctionConcepts */
    readonly functions: FunctionConcept[];

    /** A derived list of BindConcepts for inputs */
    readonly inputs: BindConcept[];

    /** A derived list of BindConcepts for properties */
    readonly properties: BindConcept[];

    /** A derived list of ConversionConcepts */
    readonly conversions: ConversionConcept[];

    constructor(
        purpose: Purpose,
        affiliation: StructureDefinition | undefined,
        definition: StructureDefinition,
        type: Type | undefined,
        examples: Node[] | undefined,
        locales: Locale[],
        context: Context
    ) {
        super(purpose, affiliation, context);

        this.definition = definition;
        this.type =
            type ??
            NameType.make(
                this.definition.names.getPreferredNameString(locales),
                this.definition
            );
        this.examples =
            examples === undefined || examples.length === 0
                ? [this.definition.getEvaluateTemplate(locales)]
                : examples;

        this.functions = this.definition
            .getFunctions()
            .map(
                (def) =>
                    new FunctionConcept(
                        Purpose.Evaluate,
                        definition,
                        def,
                        this,
                        locales,
                        context
                    )
            );
        this.conversions = this.definition
            .getAllConversions()
            .map((def) => new ConversionConcept(def, context, this));

        this.inputs = this.definition.inputs.map(
            (bind) => new BindConcept(this.purpose, bind, locales, context)
        );
        this.properties = this.definition
            .getProperties()
            .map(
                (bind) => new BindConcept(this.purpose, bind, locales, context)
            );

        this.inter = this.definition
            .getInterfaces(context)
            .map(
                (inter) =>
                    new StructureConcept(
                        purpose,
                        this.definition,
                        inter,
                        NameType.make(
                            inter.names.getPreferredNameString(locales),
                            inter
                        ),
                        [],
                        locales,
                        context
                    )
            );
    }

    getGlyphs(locales: Locale[]) {
        return {
            symbols: this.definition.names.getPreferredNameString(
                locales,
                true
            ),
        };
    }

    getEmotion() {
        return Emotion.serious;
    }

    hasName(name: string) {
        return this.definition.names.hasName(name);
    }

    getDocs(locale: Locale): Markup | undefined {
        const doc = this.definition.docs?.getPreferredLocale(locale);
        return doc?.markup.concretize(locale, []);
    }

    getName(locale: Locale, symbolic: boolean) {
        return this.definition.names.getPreferredNameString([locale], symbolic);
    }

    getRepresentation() {
        return this.examples[0];
    }

    getNodes(): Set<Node> {
        return new Set([this.type, ...this.examples]);
    }

    getText(): Set<string> {
        return new Set();
    }

    getSubConcepts(): Set<Concept> {
        return new Set([
            ...this.inputs,
            ...this.properties,
            ...this.functions,
            ...this.conversions,
        ]);
    }

    isEqualTo(concept: Concept) {
        return (
            concept instanceof StructureConcept &&
            concept.definition === this.definition
        );
    }

    /**
     * True if the concept represents the given type. Used to map types to concepts.
     */
    representsType(type: Type) {
        return (
            (type instanceof StructureDefinitionType &&
                this.definition === type.structure) ||
            (type instanceof NameType &&
                type.definition &&
                this.definition == type.definition) ||
            (type !== undefined &&
                this.type !== undefined &&
                type.constructor === this.type.constructor)
        );
    }
}
