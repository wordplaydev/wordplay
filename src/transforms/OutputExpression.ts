import type Project from '../models/Project';
import Evaluate from '../nodes/Evaluate';
import { GroupType } from '@output/Group';
import { PhraseType } from '@output/Phrase';
import { VerseType } from '@output/Verse';
import { SupportedFonts } from '../native/Fonts';
import type StructureDefinition from '@nodes/StructureDefinition';
import type Expression from '../nodes/Expression';
import type Value from '@runtime/Value';
import Bind from '@nodes/Bind';
import Literal from '@nodes/Literal';
import Measurement from '@runtime/Measurement';
import Text from '@runtime/Text';
import { ColorType } from '@output/Color';
import en from '../translation/translations/en';
import type { NameTranslation } from '../translation/Translation';
import { RowType } from '../output/Row';
import { StackType } from '../output/Stack';
import OutputPropertyRange from './OutputPropertyRange';
import OutputPropertyOptions from './OutputPropertyOptions';
import TextLiteral from '../nodes/TextLiteral';
import Reference from '../nodes/Reference';

/** Represents an editable property on the output expression, with some optional information about valid property values */
export type OutputProperty = {
    name: string;
    type:
        | OutputPropertyRange
        | OutputPropertyOptions
        | OutputPropertyText
        | 'color';
    required: boolean;
};

export class OutputPropertyText {
    readonly validator: (text: string) => boolean;
    constructor(validator: (text: string) => boolean) {
        this.validator = validator;
    }
}

/**
 * Represents the value of a property. If given is true, it means its set explicitly.
 * If false, it means that it's the default value defined on the output type.
 * Values can either be concrete values or Expressions that are computed.
 */
export type OutputPropertyValue = {
    evaluate: Evaluate;
    bind: Bind;
    given: boolean;
    value: Value | Expression;
};

function getTranslation(name: NameTranslation) {
    return typeof name === 'string' ? name : name[0];
}

// All output has these properties.
const OutputProperties: OutputProperty[] = [
    {
        name: getTranslation(en.output.type.size.name),
        type: new OutputPropertyRange(0.25, 32, 0.25, 'm'),
        required: false,
    },
    {
        name: getTranslation(en.output.type.family.name),
        type: new OutputPropertyOptions(
            [...SupportedFonts.map((font) => font.name)],
            true,
            (text: string) => TextLiteral.make(text),
            (expression: Expression | undefined) =>
                expression instanceof TextLiteral
                    ? expression.toWordplay()
                    : undefined
        ),
        required: false,
    },
    {
        name: getTranslation(en.output.type.duration.name),
        type: new OutputPropertyRange(0, 2, 0.25, 's'),
        required: false,
    },
    {
        name: getTranslation(en.output.type.style.name),
        type: new OutputPropertyOptions(
            Object.values(en.output.easing).reduce(
                (all: string[], next: NameTranslation) => [
                    ...all,
                    ...(Array.isArray(next) ? next : [next]),
                ],
                []
            ),
            true,
            (text: string) => TextLiteral.make(text),
            (expression: Expression | undefined) =>
                expression instanceof TextLiteral
                    ? expression.toWordplay()
                    : undefined
        ),
        required: false,
    },
    {
        name: getTranslation(en.output.type.name.name),
        type: new OutputPropertyText((text) => text.length > 0),
        required: false,
    },
];

const GroupProperties: OutputProperty[] = [
    {
        name: 'layout',
        type: new OutputPropertyOptions(
            [RowType, StackType].map((type) => `${type.names.getNames()[0]}`),
            false,
            (text: string) => Evaluate.make(Reference.make(text), []),
            (expression: Expression | undefined) =>
                expression instanceof Evaluate
                    ? expression.func.toWordplay()
                    : undefined
        ),
        required: false,
    },
];

const VerseProperties: OutputProperty[] = [
    {
        name: 'background',
        type: 'color' as const,
        required: false,
    },
];

const PhraseProperties: OutputProperty[] = [];

/**
 * A wrapper for Evaluate nodes that represent output.
 * This allows us to encapsulate logic that gets values
 * from an Evaluate and produce mutations of Evaluate nodes
 * to reflect an revision to its inputs.
 **/
export default class OutputExpression {
    /** The project that this node is in. */
    readonly project: Project;

    /** The evaluate node that this wraps. */
    readonly node: Evaluate;

    constructor(project: Project, evaluate: Evaluate) {
        this.project = project;
        this.node = evaluate;
    }

    /** True if the evaluate represents one of the known output types */
    isOutput() {
        const context = this.project.getNodeContext(this.node);
        return (
            this.node.is(VerseType, context) ||
            this.node.is(GroupType, context) ||
            this.node.is(PhraseType, context)
        );
    }

    getType(): StructureDefinition | undefined {
        const context = this.project.getNodeContext(this.node);
        const fun = this.node.getFunction(context);
        return fun === VerseType || fun === GroupType || fun == PhraseType
            ? fun
            : undefined;
    }

    /**
     * Returns a list of output properties that can be edited.
     * Used by Palette to display editing controls for the output.
     */
    getEditableProperties(): OutputProperty[] {
        if (!this.isOutput()) return [];

        // What type of output is this?
        const type = this.getType();

        return [
            // Add output type specific properties first
            ...(type === PhraseType
                ? PhraseProperties
                : type === GroupType
                ? GroupProperties
                : type === VerseType
                ? VerseProperties
                : []),
            ...OutputProperties,
        ];
    }

    /**
     * Given some property name, get its value or the expression that computes it.
     * If there is no property by this name, return undefined.
     */
    getPropertyValue(name: string): OutputPropertyValue | undefined {
        // What type is this evaluate creating?
        const type = this.getType();
        if (type === undefined) return undefined;

        // What binding does this name refer to?
        const binding = this.node
            .getInputMapping(type)
            .inputs.find((mapping) => mapping.expected.names.hasName(name));

        // Doesn't exist? Bail.
        if (binding === undefined) return undefined;

        // If the binding is mapped to a default value, get its value if a literal or its expression if not
        const expression =
            binding.given === undefined
                ? binding.expected.value
                : binding.given instanceof Bind
                ? binding.given.value
                : binding.given;

        // If the possible value is a list of expressions or undefined, bail.
        if (expression === undefined || Array.isArray(expression))
            return undefined;

        return {
            evaluate: this.node,
            bind: binding.expected,
            given: binding.given !== undefined,
            value:
                expression instanceof Literal
                    ? expression.getValue()
                    : expression,
        };
    }

    getNumberProperty(name: string): number | undefined {
        const value = this.getPropertyValue(name);
        return value !== undefined && value.value instanceof Measurement
            ? value.value.toNumber()
            : undefined;
        // return unit === '%' && number !== undefined ? number * 100 : number;
    }

    getTextProperty(name: string): string | undefined {
        const value = this.getPropertyValue(name);
        return value !== undefined && value.value instanceof Text
            ? value.value.text
            : undefined;
    }

    getColorProperty(name: string): Evaluate | undefined {
        const value = this.getPropertyValue(name);
        return value &&
            value.value instanceof Evaluate &&
            value.value.getFunction(
                this.project.getNodeContext(value.value)
            ) === ColorType
            ? value.value
            : undefined;
    }

    withPropertyUnset(name: string): Evaluate {
        return this.node.withBindAs(
            name,
            undefined,
            this.project.getNodeContext(this.node)
        );
    }
}
