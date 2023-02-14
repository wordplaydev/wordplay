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

/** Represents an editable property on the output expression, with some optional information about valid property values */
export type OutputProperty = {
    name: string;
    type: OutputPropertyRange | OutputPropertyOptions | 'color';
    required: boolean;
};

export class OutputPropertyRange {
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly unit: string;
    constructor(min: number, max: number, step: number, unit: string) {
        this.min = min;
        this.max = max;
        this.step = step;
        this.unit = unit;
    }
}

export class OutputPropertyOptions {
    readonly values: string[];
    constructor(values: string[]) {
        this.values = [...values];
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

// All output has these properties.
const OutputProperties: OutputProperty[] = [
    {
        name:
            typeof en.output.type.size.name === 'string'
                ? en.output.type.size.name
                : en.output.type.size.name[0],
        type: new OutputPropertyRange(0.25, 32, 0.25, 'm'),
        required: false,
    },
    {
        name:
            typeof en.output.type.family.name === 'string'
                ? en.output.type.family.name
                : en.output.type.family.name[0],
        type: new OutputPropertyOptions([
            ...SupportedFonts.map((font) => font.name),
        ]),
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

const GroupProperties: OutputProperty[] = [];
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
