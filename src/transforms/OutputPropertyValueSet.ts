import type Project from '../models/Project';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import Bool from '@runtime/Bool';
import Measurement from '../runtime/Measurement';
import Text from '@runtime/Text';
import type Value from '@runtime/Value';
import type LanguageCode from '@translation/LanguageCode';
import OutputExpression from './OutputExpression';
import type { OutputPropertyValue } from './OutputExpression';
import type OutputProperty from './OutputProperty';
import MapLiteral from '../nodes/MapLiteral';
import ListLiteral from '../nodes/ListLiteral';
import { PlaceType } from '../output/Place';
import type Bind from '../nodes/Bind';
import type Projects from '../db/Projects';

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
            const value = out.getPropertyValue(property.name);
            if (value) this.values.push(value);
        }
    }

    getBind(): Bind | undefined {
        return this.values[0]?.bind;
    }

    getTranslation(languages: LanguageCode[]): string | undefined {
        return this.getBind()?.getTranslation(languages);
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
            else if (!candidate.expression.equals(expr)) return undefined;
        }
        return expr;
    }

    getOutputExpressions(project: Project): OutputExpression[] {
        return this.values
            .filter(
                (value) => value.given && value.expression instanceof Evaluate
            )
            .map(
                (value) =>
                    new OutputExpression(project, value.expression as Evaluate)
            );
    }

    getNumber() {
        const value = this.getValue();
        return value instanceof Measurement ? value.toNumber() : undefined;
    }

    getText() {
        const value = this.getValue();
        return value instanceof Text ? value.text : undefined;
    }

    getBool() {
        const value = this.getValue();
        return value instanceof Bool ? value.bool : undefined;
    }

    getMap() {
        const expr = this.getExpression();
        return expr instanceof MapLiteral ? expr : undefined;
    }

    getList() {
        const expr = this.getExpression();
        return expr instanceof ListLiteral ? expr : undefined;
    }

    getPlace(project: Project) {
        const expr = this.getExpression();
        return expr instanceof Evaluate &&
            expr.is(PlaceType, project.getNodeContext(expr))
            ? expr
            : undefined;
    }

    getName() {
        return this.property.name;
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

    getDocs(languages: LanguageCode[]) {
        return this.values[0]?.bind.docs?.getTranslation(languages);
    }

    /** Given a project, unsets this property on expressions on which it is set. */
    unset(projects: Projects, project: Project, languages: LanguageCode[]) {
        // Find all the values that are given, then map them to [ Evaluate, Evaluate ] pairs
        // that represent the original Evaluate and the replacement without the given value.
        // If the property is required, replace with a default value.
        projects.reviseNodes(
            project,
            project.getBindReplacements(
                this.values
                    .filter((value) => value.given)
                    .map((value) => value.evaluate),
                this.property.name,
                this.property.required
                    ? this.property.create(languages)
                    : undefined
            )
        );
    }

    /** Given a project, set this property to a reasonable starting value */
    set(projects: Projects, project: Project, languages: LanguageCode[]) {
        projects.reviseNodes(
            project,
            project.getBindReplacements(
                this.values
                    .filter((value) => !value.given)
                    .map((value) => value.evaluate),
                this.property.name,
                this.property.create(languages)
            )
        );
    }
}
