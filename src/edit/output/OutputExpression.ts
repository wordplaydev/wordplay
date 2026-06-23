import Bind from '@nodes/Bind';
import Expression from '@nodes/Expression';
import Input from '@nodes/Input';
import Literal from '@nodes/Literal';
import Reference from '@nodes/Reference';
import StreamDefinition from '@nodes/StreamDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import Evaluate from '@nodes/Evaluate';
import getShapeProperties from '@edit/output/getShapeProperties';
import getGroupProperties from '@edit/output/GroupProperties';
import type OutputProperty from '@edit/output/OutputProperty';
import getPhraseProperties from '@edit/output/PhraseProperties';
import getStageProperties from '@edit/output/StageProperties';

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
    /** When the value came through a reference chain to an upstream literal/value, the leaf
     * node to replace directly when editing. Undefined for direct literals/defaults. */
    resolved: Expression | undefined;
};

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

    /** The locales currently active */
    readonly locales: Locales;

    constructor(project: Project, evaluate: Evaluate, locales: Locales) {
        this.project = project;
        this.node = evaluate;
        this.locales = locales;
    }

    /** True if the evaluate represents one of the known output types */
    isOutput() {
        return this.getType() !== undefined;
    }

    getType(): StructureDefinition | undefined {
        const context = this.project.getNodeContext(this.node);
        const fun = this.node.getFunction(context);

        return fun instanceof StructureDefinition &&
            (fun === this.project.shares.output.Stage ||
                fun === this.project.shares.output.Group ||
                fun === this.project.shares.output.Phrase ||
                fun === this.project.shares.output.Shape ||
                fun === this.project.shares.output.Pose ||
                fun === this.project.shares.output.Sequence)
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
        const locales = this.locales;

        // We handle pose types differently, so we return an empty list here.
        return type === this.project.shares.output.Pose
            ? []
            : // For all other types, we create a list of editable properties if we know how.
              [
                  // Add output type specific properties first
                  ...(type === this.project.shares.output.Phrase
                      ? getPhraseProperties(this.project, locales)
                      : type === this.project.shares.output.Group
                        ? getGroupProperties(this.project, locales)
                        : type === this.project.shares.output.Stage
                          ? getStageProperties(this.project, locales)
                          : type === this.project.shares.output.Shape
                            ? getShapeProperties(this.project, locales)
                            : []),
              ];
    }

    /**
     * Given some property name, get its value or the expression that computes it.
     * If there is no property by this name, return undefined.
     */
    getPropertyValue(name: string): OutputPropertyValue | undefined {
        // Only read inputs of an Evaluate of a structure or stream (e.g. an output type, but
        // also nested types like Matter, Rectangle, Placement, or an Arrangement that the
        // palette's nested editors edit). Not the output-type allowlist of getType().
        const context = this.project.getNodeContext(this.node);
        const fun = this.node.getFunction(context);
        if (
            !(
                fun instanceof StructureDefinition ||
                fun instanceof StreamDefinition
            )
        )
            return undefined;

        // What binding does this name refer to?
        const binding = this.node
            .getInputMapping(this.project.getNodeContext(this.node))
            ?.inputs.find((mapping) => mapping.expected.names.hasName(name));

        // Doesn't exist? Bail.
        if (binding === undefined) return undefined;

        // If the binding is mapped to a default value, get its value if a literal or its expression if not
        const input =
            binding.given === undefined
                ? binding.expected.value
                : binding.given instanceof Input
                  ? binding.given.value
                  : binding.given;

        // If the possible value is a list of expressions or undefined, bail.
        if (input === undefined || Array.isArray(input)) return undefined;

        // If the value is a reference (chain) to an upstream literal/value, resolve to that
        // leaf so it can be read and edited; otherwise use the input directly.
        const leaf =
            input instanceof Reference
                ? input.resolveToLeaf(this.project.getNodeContext(input))
                : undefined;
        const expression = leaf ?? input;

        return {
            evaluate: this.node,
            bind: binding.expected,
            given: binding.given !== undefined,
            expression:
                expression instanceof Expression ? expression : undefined,
            value:
                expression instanceof Literal
                    ? expression.getValue(this.locales.getLocales())
                    : undefined,
            // Edits target the resolved leaf only when we actually followed a reference.
            resolved: leaf,
        };
    }

    getNumberProperty(name: string): number | undefined {
        const value = this.getPropertyValue(name);
        return value !== undefined && value.value instanceof NumberValue
            ? value.value.toNumber()
            : undefined;
        // return unit === '%' && number !== undefined ? number * 100 : number;
    }

    getTextProperty(name: string): string | undefined {
        const value = this.getPropertyValue(name);
        return value !== undefined && value.value instanceof TextValue
            ? value.value.text
            : undefined;
    }

    getColorProperty(name: string): Evaluate | undefined {
        const value = this.getPropertyValue(name);
        return value &&
            value.value instanceof Evaluate &&
            value.value.getFunction(
                this.project.getNodeContext(value.value),
            ) === this.project.shares.output.Color
            ? value.value
            : undefined;
    }

    withPropertyUnset(name: string): Evaluate {
        // Find the bind corresponding to the given name.

        const context = this.project.getNodeContext(this.node);
        const fun = this.node.getFunction(context);
        const bind = fun?.inputs.find((bind) => bind.hasName(name));

        return bind
            ? this.node.withBindAs(
                  bind,
                  undefined,
                  this.project.getNodeContext(this.node),
              )
            : this.node;
    }
}
