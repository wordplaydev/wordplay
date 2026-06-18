/**
 * Registers type-mismatch conflict resolvers in the shared registry on
 * `Conflict`. This file is loaded as a top-level side effect:
 *
 * - Tests: imported by `vitest.config.ts` via `setupFiles`.
 * - App: side-effect-imported by `src/routes/+layout.svelte`.
 *
 * Loading order matters: this file imports a slew of node classes that
 * themselves import the conflict classes. Routing resolution through the
 * registry instead of having each conflict file import resolution code
 * directly breaks the conflict↔node module cycle.
 *
 * No code anywhere else should import this file.
 */

import BooleanType from '@nodes/BooleanType';
import Evaluate from '@nodes/Evaluate';
import Expression from '@nodes/Expression';
import Input from '@nodes/Input';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import { registerResolver, type Repair } from '@conflicts/Conflict';
import { makeTypeResolutions } from '@conflicts/TypeResolutions';
import IncompatibleType from '@conflicts/IncompatibleType';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import { IncompatibleKey } from '@conflicts/IncompatibleKey';
import IncompatibleCellType from '@conflicts/IncompatibleCellType';
import ExpectedBooleanCondition from '@conflicts/ExpectedBooleanCondition';
import MissingInput from '@conflicts/MissingInput';
import NodeRef from '@locale/NodeRef';
import EmptyPattern from '@conflicts/EmptyPattern';
import MalformedQuantifier from '@conflicts/MalformedQuantifier';
import DuplicateCaptureName from '@conflicts/DuplicateCaptureName';
import UndefinedBackreference from '@conflicts/UndefinedBackreference';
import UnrecognizedPatternProperty from '@conflicts/UnrecognizedPatternProperty';
import PatternLiteral from '@nodes/PatternLiteral';
import PatternSequence from '@nodes/PatternSequence';
import PatternClass from '@nodes/PatternClass';
import PatternQuantifier from '@nodes/PatternQuantifier';
import PatternCapture from '@nodes/PatternCapture';
import Token from '@nodes/Token';
import Sym from '@nodes/Sym';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import type LocaleText from '@locale/LocaleText';
import type { Template } from '@locale/LocaleText';
import { PATTERN_ANY_SYMBOL } from '@parser/Symbols';
import levenshtein from '@util/levenshtein';
import { KnownPropertyNames } from '@runtime/pattern/properties';

registerResolver(IncompatibleType, (c, context) =>
    makeTypeResolutions(
        c.expression,
        c.givenType,
        c.expectedType,
        context,
        IncompatibleType.LocalePath,
    ),
);

registerResolver(IncompatibleInput, (c, context) => {
    // The conflict's `givenNode` may be an `Input` wrapping the actual value
    // expression; unwrap to reach the expression for the type-source walk.
    const expr =
        c.givenNode instanceof Input
            ? c.givenNode.value
            : c.givenNode instanceof Expression
              ? c.givenNode
              : undefined;
    if (expr === undefined) return [];
    return makeTypeResolutions(
        expr,
        c.givenType,
        c.expectedType,
        context,
        IncompatibleInput.LocalePath,
    );
});

registerResolver(IncompatibleKey, (c, context) =>
    makeTypeResolutions(
        c.access.key,
        c.received,
        c.expected,
        context,
        IncompatibleKey.LocalePath,
    ),
);

registerResolver(IncompatibleCellType, (c, context) => {
    if (!(c.cell instanceof Expression)) return [];
    return makeTypeResolutions(
        c.cell,
        c.received,
        c.expected,
        context,
        IncompatibleCellType.LocalePath,
    );
});

registerResolver(ExpectedBooleanCondition, (c, context) =>
    makeTypeResolutions(
        c.conditional.condition,
        c.type,
        BooleanType.make(),
        context,
        ExpectedBooleanCondition.LocalePath,
    ),
);

/**
 * Add-missing-required-input resolver for `MissingInput`. Inserts the missing
 * input — using the bind's default `value` if present, else the expected
 * type's default expression, else an `ExpressionPlaceholder` — into a new
 * Evaluate that re-uses the existing tokens (`fun`, `types`, `open`, `close`).
 */
registerResolver(MissingInput, (c, context) => {
    const evaluate = c.evaluate;
    if (!(evaluate instanceof Evaluate)) return [];

    const inputBind = c.input;
    const missingDefault =
        inputBind.value ??
        inputBind.type?.getDefaultExpression?.(context) ??
        ExpressionPlaceholder.make();

    // Append the missing input. Existing inputs preserve their `Input` wrappers
    // (named-input form) if any — we just add the missing one as a positional.
    const appendedInputs: (Expression | Input)[] = [
        ...evaluate.inputs,
        missingDefault,
    ];
    const revisedEvaluate = new Evaluate(
        evaluate.fun,
        evaluate.types,
        evaluate.open,
        appendedInputs,
        evaluate.close,
    );

    const placeheldInputs: (Expression | Input)[] = [
        ...evaluate.inputs,
        // Type the placeholder with the input's expected type so the missing
        // value isn't itself a new conflict and autocomplete can take over.
        ExpressionPlaceholder.make(inputBind.type),
    ];
    const placeheldEvaluate = new Evaluate(
        evaluate.fun,
        evaluate.types,
        evaluate.open,
        placeheldInputs,
        evaluate.close,
    );

    return [
        {
            kind: 'repair',
            description: (locales, ctx) =>
                locales.concretize(
                    (l) => MissingInput.LocalePath(l).resolutionAddInput,
                    {
                        input: new NodeRef(inputBind, locales, ctx),
                    },
                ),
            mediator: (ctx) => ({
                newProject: ctx.project.withRevisedNodes([
                    [evaluate, revisedEvaluate],
                ]),
                newNode: revisedEvaluate,
            }),
        },
        {
            kind: 'repair',
            description: (locales, ctx) =>
                locales.concretize(
                    (l) => MissingInput.LocalePath(l).resolutionPlaceholder,
                    {
                        input: new NodeRef(inputBind, locales, ctx),
                    },
                ),
            mediator: (ctx) => ({
                newProject: ctx.project.withRevisedNodes([
                    [evaluate, placeheldEvaluate],
                ]),
                newNode: placeheldEvaluate,
            }),
        },
    ];
});

/* ------------------------------------------------------------------------- *
 * Pattern-sublanguage resolutions (LANGUAGE.md).
 *
 * These conflicts route through the registry via SimplePatternConflict; a
 * registered resolver here offers concrete repairs, and any pattern conflict
 * without one falls back to an explainer. Repairs reuse the offending node's
 * existing tokens where possible and rename via Token.withText so spacing is
 * preserved.
 * ------------------------------------------------------------------------- */

/** The pattern literal enclosing a node, for collecting its captures. */
function enclosingPattern(
    node: Node,
    context: Context,
): PatternLiteral | undefined {
    return context
        .getRoot(node)
        ?.getSelfAndAncestors(node)
        .find((n): n is PatternLiteral => n instanceof PatternLiteral);
}

/** The names of every capture defined in a pattern. */
function captureNames(pattern: PatternLiteral): string[] {
    return pattern
        .nodes((n): n is PatternCapture => n instanceof PatternCapture)
        .map((capture) => capture.name.getText());
}

/** Up to `limit` candidates closest to `typed` within `max` edits, nearest
 *  first — for "did you mean" suggestions. Excludes exact matches (distance 0). */
function nearest(
    typed: string,
    candidates: string[],
    max = 3,
    limit = 3,
): string[] {
    return [...new Set(candidates)]
        .map((candidate) => ({
            candidate,
            distance: levenshtein(typed, candidate, max),
        }))
        .filter(({ distance }) => distance > 0 && distance <= max)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)
        .map(({ candidate }) => candidate);
}

/** A repair that renames a `Sym.Name` token to `suggestion`, described by the
 *  conflict's `resolution` string (which takes a `suggestion` input). */
function renameSuggestion(
    nameToken: Token,
    suggestion: string,
    resolutionPath: (locale: LocaleText) => Template<['suggestion']>,
): Repair {
    const renamed = nameToken.withText(suggestion);
    return {
        kind: 'repair',
        description: (locales) =>
            locales.concretize(resolutionPath, { suggestion }),
        mediator: (ctx) => ({
            newProject: ctx.project.withRevisedNodes([[nameToken, renamed]]),
            newNode: renamed,
        }),
    };
}

// Empty pattern → fill it with a single any-grapheme atom `◌`.
registerResolver(EmptyPattern, (c) => {
    const pattern = c.node;
    const anyAtom = new PatternClass(
        new Token(PATTERN_ANY_SYMBOL, Sym.PatternAny),
    );
    const filled = new PatternLiteral(
        pattern.open,
        new PatternSequence([anyAtom]),
        pattern.close,
    );
    return [
        {
            kind: 'repair',
            description: (locales) =>
                locales.concretize(
                    (l) => EmptyPattern.LocalePath(l).resolution,
                    {},
                ),
            mediator: (ctx) => ({
                newProject: ctx.project.withRevisedNodes([[pattern, filled]]),
                newNode: filled,
            }),
        },
    ];
});

// Impossible count (min > max) → swap the bounds so the smaller comes first.
registerResolver(MalformedQuantifier, (c) => {
    const quantifier = c.node;
    if (quantifier.high === undefined) return [];
    const swapped = new PatternQuantifier(
        quantifier.relation,
        quantifier.high,
        quantifier.dash,
        quantifier.low,
    );
    return [
        {
            kind: 'repair',
            description: (locales) =>
                locales.concretize(
                    (l) => MalformedQuantifier.LocalePath(l).resolution,
                    {},
                ),
            mediator: (ctx) => ({
                newProject: ctx.project.withRevisedNodes([
                    [quantifier, swapped],
                ]),
                newNode: swapped,
            }),
        },
    ];
});

// Duplicate capture name → rename to the first numbered variant not in use.
registerResolver(DuplicateCaptureName, (c, context) => {
    const capture = c.node;
    const pattern = enclosingPattern(capture, context);
    const used = new Set(
        pattern ? captureNames(pattern) : [capture.name.getText()],
    );
    const base = capture.name.getText();
    let counter = 2;
    while (used.has(`${base}${counter}`)) counter++;
    const replacement = `${base}${counter}`;
    const renamed = capture.name.withText(replacement);
    return [
        {
            kind: 'repair',
            description: (locales) =>
                locales.concretize(
                    (l) => DuplicateCaptureName.LocalePath(l).resolution,
                    { replacement },
                ),
            mediator: (ctx) => ({
                newProject: ctx.project.withRevisedNodes([
                    [capture.name, renamed],
                ]),
                newNode: renamed,
            }),
        },
    ];
});

// Undefined backreference → suggest the nearest defined capture or known class.
registerResolver(UndefinedBackreference, (c, context) => {
    const backref = c.node;
    const pattern = enclosingPattern(backref, context);
    const candidates = [
        ...(pattern ? captureNames(pattern) : []),
        ...KnownPropertyNames,
    ];
    return nearest(backref.name.getText(), candidates).map((suggestion) =>
        renameSuggestion(
            backref.name,
            suggestion,
            (l) => UndefinedBackreference.LocalePath(l).resolution,
        ),
    );
});

// Unknown property → suggest the nearest known registry/script name.
registerResolver(UnrecognizedPatternProperty, (c) => {
    const property = c.node;
    return nearest(property.name.getText(), KnownPropertyNames).map(
        (suggestion) =>
            renameSuggestion(
                property.name,
                suggestion,
                (l) => UnrecognizedPatternProperty.LocalePath(l).resolution,
            ),
    );
});
