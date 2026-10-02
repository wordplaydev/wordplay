import { Projects } from '#db/projects/Projects.ts';
import { must } from '#util/nullable.ts';
import Evaluate from '#nodes/Evaluate.ts';
import type Expression from '#nodes/Expression.ts';
import type Node from '#nodes/Node.ts';
import BoolValue from '#values/BoolValue.ts';
import MarkupValue from '#values/MarkupValue.ts';
import NumberValue from '#values/NumberValue.ts';
import TextValue from '#values/TextValue.ts';
import type Value from '#values/Value.ts';
import type { Database } from '#db/Database.ts';
import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type Bind from '#nodes/Bind.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import MapLiteral from '#nodes/MapLiteral.ts';
import type StreamDefinition from '#nodes/StreamDefinition.ts';
import type StructureDefinition from '#nodes/StructureDefinition.ts';
import type { OutputPropertyValue } from '#edit/output/OutputExpression.ts';
import OutputExpression from '#edit/output/OutputExpression.ts';
import type OutputProperty from '#edit/output/OutputProperty.ts';

/**
 * Represents one or more equivalent inputs to an output expression.
 * Used for editing multiple inputs at once.
 */
export default class OutputPropertyValueSet {
    readonly property: OutputProperty;
    readonly outputs: OutputExpression[];
    readonly values: OutputPropertyValue[];

    /** Constructs a set of values given a set of expressions and a name on them. */
    constructor(
        property: OutputProperty,
        outputs: OutputExpression[],
        locales: Locales,
    ) {
        this.property = property;
        this.outputs = outputs;
        this.values = [];
        for (const out of outputs) {
            const name = property.getName(locales);
            const value =
                name === undefined ? undefined : out.getPropertyValue(name);
            if (value) this.values.push(value);
        }
    }

    getBind(): Bind | undefined {
        return this.values[0]?.bind;
    }

    getPreferredName(locales: LocaleText[]): string | undefined {
        return this.getBind()?.getPreferredName(locales);
    }

    /** If all the values are equivalent, returns the value, otherwise undefined */
    getValue(): Value | undefined {
        let value: Value | undefined;
        for (const candidate of this.values) {
            if (candidate.value === undefined) return undefined;
            else if (value === undefined) value = candidate.value;
            else if (!candidate.value.isEqualTo(value)) return undefined;
        }
        return value;
    }

    areSet() {
        return this.values.every((value) => value.given);
    }

    areMixed() {
        return this.getExpression() === undefined;
    }

    areDefault() {
        return this.values.every((val) => !val.given);
    }

    areEditable(project: Project) {
        const expr = this.getExpression();
        return (
            expr !== undefined &&
            this.property.editable(expr, project.getNodeContext(expr))
        );
    }

    getExpression(): Expression | undefined {
        let expr: Expression | undefined;
        for (const candidate of this.values) {
            if (candidate.expression === undefined) return undefined;
            else if (expr === undefined) expr = candidate.expression;
            else if (!candidate.expression.isEqualTo(expr)) return undefined;
        }
        return expr;
    }

    getOutputExpressions(
        project: Project,
        locales: Locales,
    ): OutputExpression[] {
        return this.values.flatMap((value) =>
            value.given && value.expression instanceof Evaluate
                ? [new OutputExpression(project, value.expression, locales)]
                : [],
        );
    }

    getNumber() {
        const value = this.getValue();
        return value instanceof NumberValue ? value.toNumber() : undefined;
    }

    getText() {
        const value = this.getValue();
        return value instanceof TextValue
            ? value.text
            : value instanceof MarkupValue
              ? value.toWordplay()
              : undefined;
    }

    getBool() {
        const value = this.getValue();
        return value instanceof BoolValue ? value.bool : undefined;
    }

    getMap() {
        const expr = this.getExpression();
        return expr instanceof MapLiteral ? expr : undefined;
    }

    getList() {
        const expr = this.getExpression();
        return expr instanceof ListLiteral ? expr : undefined;
    }

    getEvaluationOf(
        project: Project,
        definition: StructureDefinition | StreamDefinition,
    ) {
        const expr = this.getExpression();
        return expr instanceof Evaluate &&
            expr.is(definition, project.getNodeContext(expr))
            ? expr
            : undefined;
    }

    getExpressions(): Evaluate[] {
        return this.values.map((value) => value.evaluate);
    }

    /**
     * The node replacements for setting this property to a new value, routing edits of a
     * value that came through a reference chain to the upstream leaf (so the source literal
     * is modified), and otherwise setting the bind on the output Evaluate as usual.
     */
    getEditReplacements(
        project: Project,
        newValue: Expression | undefined,
    ): [Node, Node | undefined][] {
        return this.values.map((value) => {
            // Transitive value edit → replace the upstream leaf directly.
            if (value.resolved !== undefined && newValue !== undefined)
                return [value.resolved, newValue.clone()];
            // Direct/default (or unset) → set the bind on the output Evaluate, as before.
            return [
                value.evaluate,
                value.evaluate.withBindAs(
                    value.bind,
                    newValue?.clone(),
                    project.getNodeContext(value.evaluate),
                ),
            ];
        });
    }

    isEmpty() {
        return this.values.length === 0;
    }

    onAll() {
        return this.values.length === this.outputs.length;
    }

    someGiven() {
        return this.values.some((val) => val.given);
    }

    getDocs(locales: Locales) {
        return this.values[0]?.bind.docs.getPreferredLocale(locales);
    }

    /** Given a project, unsets this property on expressions on which it is set. */
    unset(projects: Database, project: Project, locales: Locales) {
        // Find all the values that are given, then map them to [ Evaluate, Evaluate ] pairs
        // that represent the original Evaluate and the replacement without the given value.
        // If the property is required, replace with a default value.
        Projects.revise(
            project,
            project.getBindReplacements(
                this.values
                    .filter((value) => value.given)
                    .map((value) => value.evaluate),
                must(this.property.getName(locales), 'a property name'),
                this.property.required
                    ? this.property.create(locales)
                    : undefined,
            ),
        );
    }

    /** Given a project, set this property to a reasonable starting value */
    set(db: Database, project: Project, locales: Locales) {
        Projects.revise(
            project,
            project.getBindReplacements(
                this.values
                    .filter((value) => !value.given)
                    .map((value) => value.evaluate),
                must(this.property.getName(locales), 'a property name'),
                this.property.create(locales),
            ),
        );
    }
}
