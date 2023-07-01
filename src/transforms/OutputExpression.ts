import type Project from '../models/Project';
import Evaluate from '../nodes/Evaluate';
import { GroupType } from '@output/Group';
import { PhraseType } from '@output/Phrase';
import { StageType } from '@output/Stage';
import StructureDefinition from '@nodes/StructureDefinition';
import Expression from '@nodes/Expression';
import type Value from '@runtime/Value';
import Bind from '@nodes/Bind';
import Literal from '@nodes/Literal';
import Measurement from '@runtime/Measurement';
import Text from '@runtime/Text';
import { ColorType } from '@output/Color';
import { PoseType } from '../output/Pose';
import { SequenceType } from '@output/Sequence';
import type OutputProperty from './OutputProperty';
import TypeOutputProperties from './TypeOutputProperties';
import GroupProperties from './GroupProperties';
import PhraseProperties from './PhraseProperties';
import StageProperties from './StageProperties';
/**
 * Represents the value of a property. If given is true, it means its set explicitly.
 * If false, it means that it's the default value defined on the output type.
 * Values can either be concrete values or Expressions that are computed.
 */
export type OutputPropertyValue = {
    evaluate: Evaluate;
    bind: Bind;
    expression: Expression | undefined;
    given: boolean;
    value: Value | undefined;
};

const SupportedTypes: StructureDefinition[] = [
    StageType,
    GroupType,
    PhraseType,
    PoseType,
    SequenceType,
];

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
        return this.getType() !== undefined;
    }

    getType(): StructureDefinition | undefined {
        const context = this.project.getNodeContext(this.node);
        const fun = this.node.getFunction(context);
        return fun instanceof StructureDefinition &&
            SupportedTypes.includes(fun)
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

        // We handle pose types differently, so we return an empty list here.
        return type === PoseType
            ? []
            : // For all other types, we create a list of editable properties.
              [
                  // Add output type specific properties first
                  ...(type === PhraseType
                      ? PhraseProperties
                      : type === GroupType
                      ? GroupProperties
                      : type === StageType
                      ? StageProperties
                      : []),
                  ...TypeOutputProperties,
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
            expression:
                expression instanceof Expression ? expression : undefined,
            value:
                expression instanceof Literal
                    ? expression.getValue()
                    : undefined,
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
