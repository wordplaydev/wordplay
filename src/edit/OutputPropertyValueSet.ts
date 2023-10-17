import type Project from '../models/Project';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import OutputExpression from './OutputExpression';
import type { OutputPropertyValue } from './OutputExpression';
import type OutputProperty from './OutputProperty';
import MapLiteral from '../nodes/MapLiteral';
import ListLiteral from '../nodes/ListLiteral';
import type Bind from '../nodes/Bind';
import type { Database } from '../db/Database';
import MarkupValue from '@values/MarkupValue';
import type Locale from '../locale/Locale';
import type StructureDefinition from '../nodes/StructureDefinition';
import type StreamDefinition from '../nodes/StreamDefinition';
import type Locales from '../locale/Locales';

/**
 * Represents one or more equivalent inputs to an output expression.
 * Used for editing multiple inputs at once.
 */
export default class OutputPropertyValueSet {
    readonly property: OutputProperty;
    readonly outputs: OutputExpression[];
    readonly values: OutputPropertyValue[];

    /** Constructs a set of values given a set of expressions and a name on them. */
    constructor(property: OutputProperty, outputs: OutputExpression[]) {
        this.property = property;
        this.outputs = outputs;
        this.values = [];
        for (const out of outputs) {
            const value = out.getPropertyValue(property.getName());
            if (value) this.values.push(value);
        }
    }

    getBind(): Bind | undefined {
        return this.values[0]?.bind;
    }

    getPreferredName(locales: Locale[]): string | undefined {
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
        locales: Locales
    ): OutputExpression[] {
        return this.values
            .filter(
                (value) => value.given && value.expression instanceof Evaluate
            )
            .map(
                (value) =>
                    new OutputExpression(
                        project,
                        value.expression as Evaluate,
                        locales
                    )
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
        definition: StructureDefinition | StreamDefinition
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
        return this.values[0]?.bind.docs?.getPreferredLocale(locales);
    }

    /** Given a project, unsets this property on expressions on which it is set. */
    unset(projects: Database, project: Project, locales: Locales) {
        // Find all the values that are given, then map them to [ Evaluate, Evaluate ] pairs
        // that represent the original Evaluate and the replacement without the given value.
        // If the property is required, replace with a default value.
        projects.Projects.revise(
            project,
            project.getBindReplacements(
                this.values
                    .filter((value) => value.given)
                    .map((value) => value.evaluate),
                this.property.getName(),
                this.property.required
                    ? this.property.create(locales)
                    : undefined
            )
        );
    }

    /** Given a project, set this property to a reasonable starting value */
    set(db: Database, project: Project, locales: Locales) {
        db.Projects.revise(
            project,
            project.getBindReplacements(
                this.values
                    .filter((value) => !value.given)
                    .map((value) => value.evaluate),
                this.property.getName(),
                this.property.create(locales)
            )
        );
    }
}
