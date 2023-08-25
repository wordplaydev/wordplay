import Node from './Node';
import type Context from './Context';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Type from './Type';
import type Step from '@runtime/Step';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import type Locale from '@locale/Locale';
import ValueRef from '@locale/ValueRef';
import type Markup from './Markup';

export enum ExpressionKind {
    Simple = 'simple',
    Evaluate = 'block',
    Definition = 'definition',
}

export default abstract class Expression extends Node {
    constructor() {
        super();
    }

    /**
     * True if the expression is involved in triggering an evaluation. Used to decide whether to present
     * as code or value during stepping.
     */
    isEvaluationInvolved() {
        return false;
    }
    isEvaluationRoot() {
        return false;
    }

    /** True if binary operations can be applied to this without wrapping it in parentheses */

    abstract computeType(context: Context): Type;

    getType(context: Context): Type {
        return context.getType(this);
    }

    abstract getDependencies(_: Context): Expression[];

    /** By default, an expression is constant if all of it's dependencies are constant. */
    isConstant(context: Context): boolean {
        // Get the expression's dependencies.
        const dependencies = this.getDependencies(context);
        // Ask the project if the dependency is constant. We ask the project since it's responsible
        // for caching whether an expression is constant and preventing cycles.
        return Array.from(dependencies).every((dependency) =>
            context.project.isConstant(dependency)
        );
    }

    /**
     * Used to determine what types are possible for a given after evalutaing this expression/
     * Most expressions do not manipulate possible types at all; primarily is just logical operators and type checks.
     * */
    abstract evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ): TypeSet;

    abstract compile(context: Context): Step[];
    abstract evaluate(evaluator: Evaluator, prior: Value | undefined): Value;

    abstract getStart(): Node;
    abstract getFinish(): Node;

    abstract getStartExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ): Markup;

    abstract getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ): Markup;

    /** Utility function for getting an optional result   */
    getValueIfDefined(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        const value = evaluator.peekValue();
        return value ? new ValueRef(value, translation, context) : undefined;
    }

    /** Get the kind of node, for highlighting or other purposes */
    getKind(): ExpressionKind {
        return ExpressionKind.Evaluate;
    }
}
