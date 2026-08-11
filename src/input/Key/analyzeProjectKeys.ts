/**
 * Which keyboard keys does a project actually listen for?
 *
 * Touch devices have no arrow keys and no room for a keyboard over the stage,
 * so when a project only checks a handful of keys we can offer those keys as
 * tappable buttons instead of summoning the on-screen keyboard. That is only
 * safe when we can bound the set, so every shape we can't interpret answers
 * `unbounded` and leaves today's soft-keyboard behavior alone.
 *
 * This runs on every project revision, so it reads only the caches Project
 * already maintains — the evaluation index and the reference index — and never
 * walks the AST itself. See the note on `getReferencesInSource` for why.
 */

import type Project from '@db/projects/Project';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import Bind from '@nodes/Bind';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Changed from '@nodes/Changed';
import Evaluate from '@nodes/Evaluate';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Input from '@nodes/Input';
import ListLiteral from '@nodes/ListLiteral';
import NoneLiteral from '@nodes/NoneLiteral';
import PropertyReference from '@nodes/PropertyReference';
import StructureDefinition from '@nodes/StructureDefinition';
import TextLiteral from '@nodes/TextLiteral';
import { EQUALS_SYMBOL, NOT_EQUALS_SYMBOL } from '@parser/Symbols';
import type Locales from '@locale/Locales';
import { canonicalizeKeyName } from '@input/Key/Key';

export type KeyAnalysis =
    /** The project responds to exactly these canonical keys. */
    | { kind: 'specific'; keys: Set<string> }
    /** Key events matter, but the key itself is never inspected. */
    | { kind: 'any' }
    /** The key's text flows somewhere we can't bound; keep the soft keyboard. */
    | { kind: 'unbounded' };

/**
 * More buttons than this would occlude the stage and shrink below a usable
 * touch target, so a project that wants that many keys keeps the keyboard.
 */
export const MaxKeyPadKeys = 12;

/** The keys `Placement` reads directly from the keyboard, which no analysis
 * can see because the mapping lives in the stage, not the project. */
export const PlacementKeys = [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    '-',
    '=',
];

/** How far to follow a value through binds and calls before giving up. */
const MaxDepth = 4;

type Collector = {
    keys: Set<string>;
    unbounded: boolean;
    /** Binds already followed, so a recursive function can't loop forever. */
    visited: Set<Bind>;
};

type Trace = {
    project: Project;
    locales: Locales;
    collector: Collector;
};

/** Analyses are pure in the project, and every edit makes a new one. */
const cache = new WeakMap<Project, KeyAnalysis>();

export default function analyzeProjectKeys(project: Project): KeyAnalysis {
    const cached = cache.get(project);
    if (cached !== undefined) return cached;
    const analysis = compute(project);
    cache.set(project, analysis);
    return analysis;
}

function compute(project: Project): KeyAnalysis {
    // The evaluation index is built by analysis, which is memoized on the
    // project and already run for conflicts before a stage renders.
    project.analyze();
    const keyDefinition = project.shares.input.Key;
    const keyBind = keyDefinition.inputs[0];
    const collector: Collector = {
        keys: new Set(),
        unbounded: false,
        visited: new Set(),
    };
    const trace: Trace = {
        project,
        locales: project.basis.locales,
        collector,
    };

    for (const evaluate of project.getEvaluationsOf(keyDefinition)) {
        const context = project.getNodeContext(evaluate);
        const filter =
            keyBind === undefined
                ? undefined
                : evaluate.getInput(keyBind, context);
        // An author-supplied filter names the key outright; no filter means
        // the stream reports every key, so we follow where its value goes.
        if (filter instanceof TextLiteral) addLiteral(filter, trace);
        else if (filter === undefined || filter instanceof NoneLiteral)
            traceUse(evaluate, trace, 0);
        else collector.unbounded = true;
        if (collector.unbounded) return { kind: 'unbounded' };
    }

    if (project.getReferences(project.shares.input.Placement).length > 0)
        for (const key of PlacementKeys) collector.keys.add(key);

    if (collector.keys.size > MaxKeyPadKeys) return { kind: 'unbounded' };
    return collector.keys.size > 0
        ? { kind: 'specific', keys: collector.keys }
        : { kind: 'any' };
}

/**
 * Collect a literal's key. Every translation counts, since one literal can
 * carry a variant per language, and each is canonicalized because programs
 * compare against localized key names (`Key.react` reports `'Space'`, not
 * `' '`) while the stage dispatches canonical ones.
 */
function addLiteral(literal: TextLiteral, trace: Trace) {
    for (const translation of literal.texts)
        trace.collector.keys.add(
            canonicalizeKeyName(translation.getText(), trace.locales),
        );
}

/** Follow a value that holds a key to wherever it is inspected. */
function traceUse(node: Node, trace: Trace, depth: number) {
    const { project, collector } = trace;
    if (collector.unbounded) return;
    if (depth > MaxDepth) {
        collector.unbounded = true;
        return;
    }

    const parent = project.getRoot(node)?.getParent(node);
    if (parent === undefined) {
        // A value that reaches nothing is never inspected.
        return;
    }
    const context = project.getNodeContext(parent);

    // `∆ key` asks whether a key happened, not which one.
    if (parent instanceof Changed) return;

    // A bind just renames the value; follow everything that reads it.
    if (parent instanceof Bind) {
        traceBind(parent, trace, depth);
        return;
    }

    if (parent instanceof BinaryEvaluate) {
        const operator = parent.getOperator();
        if (operator !== EQUALS_SYMBOL && operator !== NOT_EQUALS_SYMBOL) {
            collector.unbounded = true;
            return;
        }
        const other = parent.left === node ? parent.right : parent.left;
        if (other instanceof TextLiteral) addLiteral(other, trace);
        // Comparing against a structure's field bounds the key to whatever
        // that field is ever built with, which is how a project can keep its
        // keys in a table of data rather than in the comparison itself.
        else if (other instanceof PropertyReference)
            traceFieldLiterals(other, trace);
        else collector.unbounded = true;
        return;
    }

    if (parent instanceof Evaluate) {
        traceArgument(parent, node, context, trace, depth);
        return;
    }

    // Anything else — displayed, indexed with, stored, converted — could
    // involve any key at all.
    collector.unbounded = true;
}

/** Follow every reference to a bind holding a key. */
function traceBind(bind: Bind, trace: Trace, depth: number) {
    if (trace.collector.visited.has(bind)) return;
    trace.collector.visited.add(bind);
    for (const reference of trace.project.getReferences(bind)) {
        traceUse(reference, trace, depth + 1);
        if (trace.collector.unbounded) return;
    }
}

/**
 * A key passed to a function: follow the parameter it lands in, so a project
 * can handle its keys in a helper rather than inline.
 */
function traceArgument(
    evaluate: Evaluate,
    node: Node,
    context: Context,
    trace: Trace,
    depth: number,
) {
    // `['a' 'e'].has(key)` bounds the key to the list's own literals.
    if (evaluate.fun instanceof PropertyReference) {
        const receiver = evaluate.fun.structure;
        if (receiver instanceof ListLiteral) {
            const literals = receiver.values.filter(
                (value) => value instanceof TextLiteral,
            );
            if (literals.length === receiver.values.length) {
                for (const literal of literals) addLiteral(literal, trace);
                return;
            }
        }
    }

    const fun = evaluate.getFunction(context);
    // A structure construction stores the key for later; we can't tell where
    // it resurfaces. Basis functions are opaque for the same reason.
    if (!(fun instanceof FunctionDefinition)) {
        trace.collector.unbounded = true;
        return;
    }

    const parameter = parameterFor(evaluate, node, context);
    if (parameter === undefined) {
        trace.collector.unbounded = true;
        return;
    }
    traceBind(parameter, trace, depth);
}

/** Which parameter of this evaluation the given argument was passed as. */
function parameterFor(
    evaluate: Evaluate,
    node: Node,
    context: Context,
): Bind | undefined {
    const mapping = evaluate.getInputMapping(context);
    if (mapping === undefined) return undefined;
    for (const { expected, given } of mapping.inputs) {
        if (given === undefined) continue;
        const values = Array.isArray(given) ? given : [given];
        for (const value of values) {
            const expression = value instanceof Input ? value.value : value;
            if (expression === node) return expected;
        }
    }
    return undefined;
}

/**
 * Every literal a structure's field is ever constructed with. If any
 * construction computes the field instead, the set is open-ended.
 */
function traceFieldLiterals(reference: PropertyReference, trace: Trace) {
    const { project, collector } = trace;
    const context = project.getNodeContext(reference);
    const field = reference.resolve(context);
    if (!(field instanceof Bind)) {
        collector.unbounded = true;
        return;
    }
    const structure = project
        .getRoot(field)
        ?.getAncestors(field)
        .find((ancestor) => ancestor instanceof StructureDefinition);
    if (structure === undefined) {
        collector.unbounded = true;
        return;
    }
    const constructions = project.getEvaluationsOf(structure);
    if (constructions.length === 0) {
        collector.unbounded = true;
        return;
    }
    for (const construction of constructions) {
        const given = construction.getInput(
            field,
            project.getNodeContext(construction),
        );
        if (given instanceof TextLiteral) addLiteral(given, trace);
        else {
            collector.unbounded = true;
            return;
        }
    }
}
