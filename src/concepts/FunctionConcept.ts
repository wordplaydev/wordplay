import BinaryOperation from '@nodes/BinaryOperation';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type LanguageCode from '@locale/LanguageCode';
import type Node from '@nodes/Node';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import Token from '@nodes/Token';
import TokenType from '@nodes/TokenType';
import UnaryOperation from '@nodes/UnaryOperation';
import BindConcept from './BindConcept';
import Concept from './Concept';
import type StructureConcept from './StructureConcept';
import type Locale from '@locale/Locale';
import type Purpose from './Purpose';
import type StructureDefinition from '@nodes/StructureDefinition';
import Emotion from '../lore/Emotion';
import FunctionType from '../nodes/FunctionType';
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

        const reference = Reference.make(
            this.definition.names.getLocaleText(languages),
            this.definition
        );

        this.example =
            this.definition.isUnaryOperator() && this.structure
                ? new UnaryOperation(
                      new Token(
                          this.definition.getUnaryOperatorName() ?? '_',
                          TokenType.UnaryOperator
                      ),
                      ExpressionPlaceholder.make(this.structure.type)
                  )
                : this.definition.isBinaryOperator() && this.structure
                ? new BinaryOperation(
                      ExpressionPlaceholder.make(this.structure.type),
                      new Token(
                          this.definition.getBinaryOperatorName() ?? '_',
                          TokenType.BinaryOperator
                      ),
                      ExpressionPlaceholder.make(
                          this.definition.inputs[0]?.type
                      )
                  )
                : Evaluate.make(
                      this.structure
                          ? PropertyReference.make(
                                ExpressionPlaceholder.make(this.structure.type),
                                reference
                            )
                          : reference,
                      this.definition.inputs
                          .filter((input) => !input.hasDefault())
                          .map((input) => {
                              if (input.type instanceof FunctionType)
                                  return input.type.getFunctionPlaceholder();
                              else
                                  return ExpressionPlaceholder.make(input.type);
                          })
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

    getDocs(translation: Locale): Markup | undefined {
        const doc = this.definition.docs?.getLocale(translation.language);
        return doc?.markup;
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

    equals(concept: Concept) {
        return (
            concept instanceof FunctionConcept &&
            concept.definition.isEqualTo(this.definition)
        );
    }
}
