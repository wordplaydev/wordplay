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
import { UnknownName } from '@conflicts/UnknownName';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import FunctionDefinition from '@nodes/FunctionDefinition';
import PropertyReference from '@nodes/PropertyReference';
import Reference from '@nodes/Reference';
import StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import StructureType from '@nodes/StructureType';

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

/* ---------------------------------------------------------------------------
 * UnknownName → `Structure.name`
 *
 * A name that doesn't resolve in scope may still exist as a `↑` static member of
 * a structure that does — `sway` is `Sequence.sway`, `red` is `Color.red`,
 * `piano` is `Instrument.piano`. This is the migration aid for the predefined
 * animations moving onto `Sequence`, but it applies to every structure with
 * statics, including a creator's own.
 * ------------------------------------------------------------------------- */

/** A definition's preferred name in words, never its symbolic one. */
function wordName(
    definition: StructureDefinition | Bind | FunctionDefinition,
    locales: Locales,
): string {
    return definition.names.getPreferredNameString(locales.getLocales(), false);
}

/** How many `Structure.name` suggestions to offer before the annotation is a wall of buttons. */
const MaxStaticSuggestions = 5;

/** Every structure whose statics are worth searching: the globals, the basis, and any
 *  structure the unknown name itself could have seen. Deduped by identity. */
function structuresInScope(
    node: Node,
    context: Context,
): StructureDefinition[] {
    const found = new Set<StructureDefinition>();
    for (const definition of [
        ...context.project.shares.all,
        ...context.getBasis().getAllStructureDefinitions(),
        ...node.getDefinitionsInScope(context),
    ])
        if (definition instanceof StructureDefinition) found.add(definition);
    return [...found];
}

/** The `Evaluate` that calls this reference, if the reference is what's being called. */
function callOf(reference: Reference, context: Context): Evaluate | undefined {
    const parent = reference.getParent(context);
    return parent instanceof Evaluate && parent.fun === reference
        ? parent
        : undefined;
}

/** The `Evaluate` this expression is an argument to, seeing through a named `Input`. */
function argumentOf(node: Node, context: Context): Evaluate | undefined {
    const parent = node.getParent(context);
    const outer = parent instanceof Input ? parent.getParent(context) : parent;
    return outer instanceof Evaluate ? outer : undefined;
}

/** The type this position expects, when it's an argument of an evaluate we can resolve. */
function expectedTypeAt(node: Node, context: Context): Type | undefined {
    const outer = argumentOf(node, context);
    return outer
        ?.getInputMapping(context)
        ?.inputs.find((input) => holds(input.given, node))
        ?.expected.getType(context);
}

/** Whether a mapping's given value is (or wraps, or contains) this node. */
function holds(
    given: Expression | Input | (Expression | Input)[] | undefined,
    node: Node,
): boolean {
    if (given === undefined) return false;
    if (Array.isArray(given)) return given.some((one) => holds(one, node));
    return given === node || (given instanceof Input && given.value === node);
}

/** What the code would evaluate to after this repair: a called function's output, else the member. */
function repairedType(
    member: Bind | FunctionDefinition,
    called: boolean,
    context: Context,
): Type {
    return member instanceof FunctionDefinition && called
        ? member.getOutputType(context)
        : member.getType(context);
}

/**
 * How a `Structure.name` repair should be applied, or `undefined` when it shouldn't be
 * offered at all.
 *
 * `'unwrap'` is for a static that returns the very structure the call is already wrapped in,
 * which makes that wrapper redundant: repairing `Sequence(sway())` in place would give
 * `Sequence(Sequence.sway())` — a Sequence sitting in a poses map, one conflict traded for
 * another. `undefined` covers the rest of that class: a suggestion whose type doesn't fit
 * where it's going is no better than the conflict it replaces, so we say nothing and let the
 * explainer stand.
 */
function repairKind(
    reference: Reference,
    structure: StructureDefinition,
    member: Bind | FunctionDefinition,
    context: Context,
): 'in-place' | 'unwrap' | undefined {
    const call = callOf(reference, context);
    const type = repairedType(member, call !== undefined, context);

    if (
        call !== undefined &&
        argumentOf(call, context)?.getFunction(context) === structure &&
        type instanceof StructureType &&
        type.definition === structure
    )
        return 'unwrap';

    // When we can't tell what the position expects, offer it — the suggestion is still the
    // creator's best lead, and a wrong guess is visible and undoable.
    const expected = expectedTypeAt(call ?? reference, context);
    return expected === undefined || expected.accepts(type, context)
        ? 'in-place'
        : undefined;
}

/**
 * Replace the redundant wrapper with the static call, carrying the wrapper's remaining
 * arguments across **by name**. The static's own inputs come first, so carrying them
 * positionally would capture them: `Sequence(sway() 3s)` must not become `Sequence.sway(3s)`,
 * which binds 3s to `angle` rather than `duration`.
 */
function unwrap(
    call: Evaluate,
    outer: Evaluate,
    property: PropertyReference,
    context: Context,
    locales: Locales,
): [Node, Node] {
    const carried: (Expression | Input)[] = [];
    for (const input of outer.getInputMapping(context)?.inputs ?? []) {
        const given = input.given;
        if (given === undefined || Array.isArray(given)) continue;
        const value = given instanceof Input ? given.value : given;
        if (value === call) continue;
        carried.push(
            Input.make(wordName(input.expected, locales), value.clone()),
        );
    }
    return [
        outer,
        Evaluate.make(property, [
            ...call.inputs.map((input) => input.clone()),
            ...carried,
        ]),
    ];
}

registerResolver(UnknownName, (conflict, context) => {
    const reference = conflict.name;
    if (!(reference instanceof Reference)) return [];
    const typed = reference.getName();

    // Exact matches first, then near ones, so a rename lands above a typo correction.
    const exact: [StructureDefinition, Bind | FunctionDefinition][] = [];
    const near: [StructureDefinition, Bind | FunctionDefinition][] = [];
    for (const structure of structuresInScope(reference, context))
        for (const member of structure.getStaticDefinitions(context)) {
            const names = member.names.getNames();
            if (names.some((name) => name === typed))
                exact.push([structure, member]);
            else if (names.some((name) => levenshtein(typed, name, 1) <= 1))
                near.push([structure, member]);
        }

    return [...exact, ...near]
        .map(
            ([structure, member]) =>
                [
                    structure,
                    member,
                    repairKind(reference, structure, member, context),
                ] as const,
        )
        .filter(([, , kind]) => kind !== undefined)
        .slice(0, MaxStaticSuggestions)
        .map(([structure, member, kind]) => {
            const repair: Repair = {
                kind: 'repair',
                description: (locales) =>
                    locales.concretize(
                        (l) =>
                            l.node.Reference.conflict.UnknownName
                                .staticResolution,
                        {
                            owner: wordName(structure, locales),
                            suggestion: wordName(member, locales),
                        },
                    ),
                mediator: (context, locales) => {
                    // Spell both out in words rather than symbols. The creator typed a word
                    // and is being shown where it moved to; answering `🔈.🎹` to `piano`
                    // reads as a different thing entirely.
                    const property = PropertyReference.make(
                        Reference.make(wordName(structure, locales), structure),
                        Reference.make(wordName(member, locales), member),
                    );
                    const call = callOf(reference, context);
                    const outer = call ? argumentOf(call, context) : undefined;
                    const [target, node] =
                        kind === 'unwrap' && call && outer
                            ? unwrap(call, outer, property, context, locales)
                            : [reference, property];
                    return {
                        newProject: context.project.withRevisedNodes([
                            [target, node],
                        ]),
                        newNode: node,
                    };
                },
            };
            return repair;
        });
});
