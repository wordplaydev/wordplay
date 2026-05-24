import type Context from '@nodes/Context';
import Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import Node from '@nodes/Node';
import type LocaleText from '@locale/LocaleText';
import type { Template } from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type { TypeResolutionTemplates } from '@locale/NodeTexts';
import type { Resolution } from '@conflicts/Conflict';
import NodeRef from '@locale/NodeRef';
import Token from '@nodes/Token';
import { Sym } from '@nodes/Sym';
import { LITERAL_SYMBOL } from '@parser/Symbols';
import ListLiteral from '@nodes/ListLiteral';
import SetLiteral from '@nodes/SetLiteral';
import MapLiteral from '@nodes/MapLiteral';
import ListType from '@nodes/ListType';
import SetType from '@nodes/SetType';
import MapType from '@nodes/MapType';
import NoneType from '@nodes/NoneType';
import UnionType from '@nodes/UnionType';
import StructureType from '@nodes/StructureType';
import Otherwise from '@nodes/Otherwise';
import Conditional from '@nodes/Conditional';
import Is from '@nodes/Is';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Bind from '@nodes/Bind';
import Reference from '@nodes/Reference';
import KeyValue from '@nodes/KeyValue';
import Evaluate from '@nodes/Evaluate';
import type Source from '@nodes/Source';
import { makeConversionResolutions } from '@conflicts/ConversionResolutions';
import walkTypeSources from '@conflicts/walkTypeSources';

type TemplatesAccessor = (locales: LocaleText) => TypeResolutionTemplates;

/** Maximum number of suggestions a single conflict produces. */
const RESOLUTION_CAP = 4;

/**
 * Returns suggested fixes for a type mismatch. Generators run in order; each
 * returns at most one Resolution per candidate node. Forward-validation
 * (`forwardValidates`) gates any candidate whose edit target is deeper than
 * the symptom site, since the symptom's type only updates via propagation.
 * The placeholder fallback fires only when nothing else produced a result.
 */
export function makeTypeResolutions(
    givenNode: Expression,
    givenType: Type,
    expectedType: Type,
    context: Context,
    templates: TemplatesAccessor,
): Resolution[] {
    const candidates: Resolution[] = [];

    // 1. Convert wrapping at the symptom site. Existing helper handles
    //    conversion-path search + unit annotation on bare number literals.
    candidates.push(
        ...makeConversionResolutions(
            givenNode,
            givenType,
            expectedType,
            context,
            (l) => templates(l).resolution,
        ),
    );

    // 2. Symptom-site generators (no dependency walk needed).
    pushIf(
        candidates,
        generateWrapResolution(
            givenNode,
            givenType,
            expectedType,
            context,
            templates,
        ),
    );
    pushIf(
        candidates,
        generateStructureResolution(
            givenNode,
            givenType,
            expectedType,
            context,
            templates,
        ),
    );
    pushIf(
        candidates,
        generateOtherwiseResolution(
            givenNode,
            givenType,
            expectedType,
            context,
            templates,
        ),
    );
    pushIf(
        candidates,
        generateGuardResolution(
            givenNode,
            givenType,
            expectedType,
            context,
            templates,
        ),
    );
    pushIf(
        candidates,
        generateReorderResolution(
            givenNode,
            expectedType,
            context,
            templates,
        ),
    );

    // 3. Walk dependencies and try the candidate-needs-validation generators.
    for (const { node, type } of walkTypeSources(givenNode, context)) {
        // Literal annotation (`!`) on a list/set/map; requires forward
        // validation because the candidate is usually a dependency of the
        // symptom (e.g. a ListLiteral whose access produces the symptom).
        const literal = generateLiteralResolution(node, expectedType, templates);
        if (literal && forwardValidates(literal, givenNode, expectedType, context))
            candidates.push(literal);

        // Bind default fix at the source binding rather than at every use.
        const bindDefault = generateBindDefaultResolution(
            node,
            type,
            expectedType,
            context,
            templates,
        );
        if (
            bindDefault &&
            forwardValidates(bindDefault, givenNode, expectedType, context)
        )
            candidates.push(bindDefault);

        // Explicit type declaration on a Bind, replacing the generalize step.
        const declaration = generateDeclarationResolution(
            node,
            expectedType,
            context,
            templates,
        );
        if (
            declaration &&
            forwardValidates(declaration, givenNode, expectedType, context)
        )
            candidates.push(declaration);

        // Widen a Bind's declared type to include the given.
        const widen = generateWidenResolution(
            node,
            givenType,
            expectedType,
            context,
            templates,
        );
        if (widen && forwardValidates(widen, givenNode, expectedType, context))
            candidates.push(widen);
    }

    // 4. Last-resort placeholder fallback — only when nothing else fired.
    if (candidates.length === 0) {
        const placeholder = generatePlaceholderResolution(
            givenNode,
            expectedType,
            templates,
        );
        if (placeholder) candidates.push(placeholder);
    }

    return candidates.slice(0, RESOLUTION_CAP);
}

function pushIf<T>(arr: T[], value: T | undefined): void {
    if (value !== undefined) arr.push(value);
}

// --- Generators ---------------------------------------------------------

/**
 * Literal-annotation edit. If `candidate` is a `ListLiteral` / `SetLiteral` /
 * `MapLiteral` without its `!` token, clone it with the token set. The cheap
 * pre-check is just whether the literal flag is missing; `forwardValidates`
 * decides whether the resulting type satisfies the slot.
 */
function generateLiteralResolution(
    candidate: Expression,
    expectedType: Type,
    templates: TemplatesAccessor,
): Resolution | undefined {
    if (
        !(candidate instanceof ListLiteral) &&
        !(candidate instanceof SetLiteral) &&
        !(candidate instanceof MapLiteral)
    )
        return undefined;
    if (candidate.literal !== undefined) return undefined;

    const revised = candidate.clone({
        original: 'literal',
        replacement: new Token(LITERAL_SYMBOL, Sym.Literal),
        report: 'silent',
    });
    return makeResolution(
        candidate,
        revised,
        expectedType,
        (l) => templates(l).resolutionLiteral,
    );
}

/**
 * None-coalescing edit. When the symptom's type is a union containing `ø` and
 * removing the `ø` would satisfy the expected slot, wrap the given expression
 * in `givenNode ?? <default>` where `<default>` is `expectedType`'s default
 * expression (or a placeholder if none exists).
 */
function generateOtherwiseResolution(
    givenNode: Expression,
    givenType: Type,
    expectedType: Type,
    context: Context,
    templates: TemplatesAccessor,
): Resolution | undefined {
    const members = givenType.getPossibleTypes(context);
    if (!members.some((m) => m instanceof NoneType)) return undefined;
    const withoutNone = members.filter((m) => !(m instanceof NoneType));
    if (withoutNone.length === 0) return undefined;
    const narrowed = UnionType.getPossibleUnion(context, withoutNone);
    if (!expectedType.accepts(narrowed, context)) return undefined;

    const fallback =
        expectedType.getDefaultExpression?.(context) ??
        ExpressionPlaceholder.make();
    const revised = Otherwise.make(givenNode, fallback);

    return makeResolution(
        givenNode,
        revised,
        expectedType,
        (l) => templates(l).resolutionOtherwise,
    );
}

/**
 * Type-guard edit. When the symptom is a `Reference` whose type is a
 * multi-member union and exactly one member satisfies the expected type,
 * wrap the reference in `ref•T ? ref _` (Conditional with Is). Restricted
 * to References because Wordplay only type-narrows known-named binds.
 */
function generateGuardResolution(
    givenNode: Expression,
    givenType: Type,
    expectedType: Type,
    context: Context,
    templates: TemplatesAccessor,
): Resolution | undefined {
    if (!(givenNode instanceof Reference)) return undefined;
    const members = givenType.getPossibleTypes(context);
    if (members.length < 2) return undefined;
    const accepted = members.filter((m) => expectedType.accepts(m, context));
    if (accepted.length !== 1) return undefined;

    // Use a fresh Reference for the yes branch so the same Node isn't shared
    // across two AST positions.
    const yes = Reference.make(givenNode.getName());
    const revised = Conditional.make(
        Is.make(givenNode, accepted[0]),
        yes,
        ExpressionPlaceholder.make(),
    );

    return makeResolution(
        givenNode,
        revised,
        expectedType,
        (l) => templates(l).resolutionGuard,
    );
}

/**
 * Type-declaration edit. When the candidate is a `Bind` without an explicit
 * type whose value is a `ListLiteral` / `SetLiteral` / `MapLiteral`, propose
 * a new bind with the literal-flagged type as its declared annotation.
 */
function generateDeclarationResolution(
    candidate: Expression,
    expectedType: Type,
    context: Context,
    templates: TemplatesAccessor,
): Resolution | undefined {
    if (!(candidate instanceof Bind)) return undefined;
    if (candidate.type !== undefined) return undefined;
    if (candidate.value === undefined) return undefined;

    const value = candidate.value;
    if (
        !(value instanceof ListLiteral) &&
        !(value instanceof SetLiteral) &&
        !(value instanceof MapLiteral)
    )
        return undefined;

    // Compute the type the value would have with `!` set.
    const flagged = value.clone({
        original: 'literal',
        replacement: new Token(LITERAL_SYMBOL, Sym.Literal),
        report: 'silent',
    });
    const declaredType = flagged.computeType(context);

    const revised = Bind.make(
        candidate.docs.isEmpty() ? undefined : candidate.docs,
        candidate.names,
        declaredType,
        candidate.value,
    );

    return makeResolution(
        candidate,
        revised,
        expectedType,
        (l) => templates(l).resolutionDeclaration,
    );
}

/**
 * Wrap-in-collection edit. When the expected type is a `ListType` /
 * `SetType` / `MapType` and the given expression's type satisfies the
 * collection's element type, wrap the given in the matching literal.
 */
function generateWrapResolution(
    givenNode: Expression,
    givenType: Type,
    expectedType: Type,
    context: Context,
    templates: TemplatesAccessor,
): Resolution | undefined {
    if (expectedType instanceof ListType) {
        if (
            expectedType.type !== undefined &&
            !expectedType.type.accepts(givenType, context)
        )
            return undefined;
        const wrapped = ListLiteral.make([givenNode]);
        return makeResolution(
            givenNode,
            wrapped,
            expectedType,
            (l) => templates(l).resolutionWrap,
        );
    }
    if (expectedType instanceof SetType) {
        if (
            expectedType.key !== undefined &&
            !expectedType.key.accepts(givenType, context)
        )
            return undefined;
        const wrapped = SetLiteral.make([givenNode]);
        return makeResolution(
            givenNode,
            wrapped,
            expectedType,
            (l) => templates(l).resolutionWrap,
        );
    }
    if (expectedType instanceof MapType) {
        // Map needs both key and value; suggest `{ given: _ }`.
        if (
            expectedType.key !== undefined &&
            !expectedType.key.accepts(givenType, context)
        )
            return undefined;
        const kv = KeyValue.make(givenNode, ExpressionPlaceholder.make());
        const wrapped = MapLiteral.make([kv]);
        return makeResolution(
            givenNode,
            wrapped,
            expectedType,
            (l) => templates(l).resolutionWrap,
        );
    }
    return undefined;
}

/**
 * Inline-structure edit. When the expected type is a `StructureType` and the
 * structure's first required input accepts the given expression's type,
 * propose wrapping the given in `Structure(given)`.
 */
function generateStructureResolution(
    givenNode: Expression,
    givenType: Type,
    expectedType: Type,
    context: Context,
    templates: TemplatesAccessor,
): Resolution | undefined {
    if (!(expectedType instanceof StructureType)) return undefined;
    const inputs = expectedType.definition.inputs;
    if (inputs.length === 0) return undefined;
    const first = inputs[0];
    const firstType = first.type;
    if (firstType === undefined) return undefined;
    if (!firstType.accepts(givenType, context)) return undefined;

    const structureName = expectedType.definition.getNames()[0];
    if (structureName === undefined) return undefined;
    const call = Evaluate.make(Reference.make(structureName), [givenNode]);

    return makeResolution(
        givenNode,
        call,
        expectedType,
        (l) => templates(l).resolutionStructure,
    );
}

/**
 * Bind default. When the candidate is a `Bind` whose value type includes `ø`
 * (or whose value is undefined / placeholder), propose editing the bind to
 * carry a non-none default of the expected type. Resolves a Reference-site
 * none-mismatch at the source binding rather than at every use.
 */
function generateBindDefaultResolution(
    candidate: Expression,
    candidateType: Type,
    expectedType: Type,
    context: Context,
    templates: TemplatesAccessor,
): Resolution | undefined {
    if (!(candidate instanceof Bind)) return undefined;
    // Only fire when the bind's current value type is a union containing ø
    // (or the bind has no value at all).
    const members = candidateType.getPossibleTypes(context);
    const hasNone =
        members.some((m) => m instanceof NoneType) || candidate.value === undefined;
    if (!hasNone) return undefined;

    const defaultExpr = expectedType.getDefaultExpression?.(context);
    if (defaultExpr === undefined) return undefined;

    const revised = Bind.make(
        candidate.docs.isEmpty() ? undefined : candidate.docs,
        candidate.names,
        candidate.type,
        defaultExpr,
    );
    return makeResolution(
        candidate,
        revised,
        expectedType,
        (l) => templates(l).resolutionDefault,
    );
}

/**
 * Widen-expected edit. When the candidate is a Bind with an explicit type
 * narrower than what its value actually is, propose broadening the bind's
 * declared type to the union of its current type with the value's type.
 */
function generateWidenResolution(
    candidate: Expression,
    givenType: Type,
    expectedType: Type,
    context: Context,
    templates: TemplatesAccessor,
): Resolution | undefined {
    if (!(candidate instanceof Bind)) return undefined;
    if (candidate.type === undefined) return undefined;
    // Only fire when the declared type doesn't accept the given.
    if (candidate.type.accepts(givenType, context)) return undefined;

    const widened = UnionType.make(candidate.type, givenType);
    const revised = Bind.make(
        candidate.docs.isEmpty() ? undefined : candidate.docs,
        candidate.names,
        widened,
        candidate.value,
    );
    return makeResolution(
        candidate,
        revised,
        expectedType,
        (l) => templates(l).resolutionWiden,
    );
}

/**
 * Reorder evaluate arguments. Walks up to the enclosing `Evaluate` from the
 * symptom site; for each pair (i, j) of positional inputs, checks whether
 * swapping them would satisfy both slots' expected types. Proposes the
 * swapped Evaluate.
 */
function generateReorderResolution(
    givenNode: Expression,
    expectedType: Type,
    context: Context,
    templates: TemplatesAccessor,
): Resolution | undefined {
    const root = context.source.root;
    let parent: Node | undefined = root.getParent(givenNode);
    while (parent !== undefined && !(parent instanceof Evaluate))
        parent = root.getParent(parent);
    if (!(parent instanceof Evaluate)) return undefined;

    const fn = parent.getFunction(context);
    if (fn === undefined) return undefined;

    const positional = parent.inputs.filter(
        (i): i is Expression => i instanceof Expression,
    );
    if (positional.length < 2) return undefined;

    const fnInputs = fn.inputs;
    // Try each adjacent pair (and one non-adjacent) — limit work to O(n^2)
    // but cap at reasonable arg counts.
    if (positional.length > 6) return undefined;

    for (let i = 0; i < positional.length; i++) {
        for (let j = i + 1; j < positional.length; j++) {
            if (i >= fnInputs.length || j >= fnInputs.length) continue;
            const slotI = fnInputs[i].getType(context);
            const slotJ = fnInputs[j].getType(context);
            const typeI = positional[i].getType(context);
            const typeJ = positional[j].getType(context);
            if (
                slotI.accepts(typeJ, context) &&
                slotJ.accepts(typeI, context) &&
                !slotI.accepts(typeI, context) // current order is broken
            ) {
                const swapped = positional.slice();
                swapped[i] = positional[j];
                swapped[j] = positional[i];
                // Build a fresh Evaluate with the swapped positional args.
                const newEvaluate = Evaluate.make(parent.fun, swapped);
                return makeResolution(
                    parent,
                    newEvaluate,
                    expectedType,
                    (l) => templates(l).resolutionReorder,
                );
            }
        }
    }
    return undefined;
}

/**
 * Last-resort placeholder fallback. Replaces the offending expression with an
 * ExpressionPlaceholder so the type checker stops complaining and the user
 * can invoke the autocomplete menu on the resulting `_` to pick a real value.
 */
function generatePlaceholderResolution(
    givenNode: Expression,
    expectedType: Type,
    templates: TemplatesAccessor,
): Resolution | undefined {
    const placeholder = ExpressionPlaceholder.make();
    return makeResolution(
        givenNode,
        placeholder,
        expectedType,
        (l) => templates(l).resolutionPlaceholder,
    );
}

// --- Validation ---------------------------------------------------------

/**
 * Apply a resolution in a hypothetical revised project and check whether the
 * type at the symptom site now satisfies the expected type. Needed for edits
 * whose target is *deeper* than the symptom — the literal flag on a
 * `ListLiteral` only helps if the propagated type at the access site actually
 * becomes acceptable.
 */
function forwardValidates(
    resolution: Resolution,
    symptomNode: Expression,
    expectedType: Type,
    context: Context,
): boolean {
    try {
        const newProject = resolution.mediator(
            context,
            context.project.getLocales(),
        ).newProject;

        const oldSource = context.project.getSourceOf(symptomNode);
        if (oldSource === undefined) return false;
        const newSource = newProject
            .getSources()
            .find((s: Source) => s.names.sharesName(oldSource.names));
        if (newSource === undefined) return false;

        const path = getTreePath(oldSource, symptomNode);
        if (path === undefined) return false;
        const newSymptom = walkTreePath(newSource.expression, path);
        if (!(newSymptom instanceof Expression)) return false;

        const newContext = newProject.getContext(newSource);
        const newType = newSymptom.getType(newContext);
        return expectedType.accepts(newType, newContext);
    } catch {
        return false;
    }
}

/** Tree path from source.expression down to `target`, by (field, index) steps. */
function getTreePath(
    source: Source,
    target: Node,
): { field: string; index: number }[] | undefined {
    const root = source.root;
    const path: { field: string; index: number }[] = [];
    let current: Node = target;
    while (current !== source.expression) {
        const parent = root.getParent(current);
        if (parent === undefined) return undefined;
        const field = parent.getFieldOfChild(current);
        if (field === undefined) return undefined;
        const value = parent.getField(field.name);
        const index = Array.isArray(value) ? value.indexOf(current) : -1;
        path.unshift({ field: field.name, index });
        current = parent;
    }
    return path;
}

/** Walk a tree path produced by {@link getTreePath} from `root` to its target. */
function walkTreePath(
    root: Node,
    path: { field: string; index: number }[],
): Node | undefined {
    let current: Node = root;
    for (const step of path) {
        const value = current.getField(step.field);
        if (Array.isArray(value)) {
            if (step.index < 0 || step.index >= value.length) return undefined;
            current = value[step.index];
        } else if (value instanceof Node) {
            current = value;
        } else {
            return undefined;
        }
    }
    return current;
}

// --- Resolution construction --------------------------------------------

function makeResolution(
    target: Node,
    replacement: Expression,
    expectedType: Type,
    accessor: (l: LocaleText) => Template<['expected']>,
): Resolution {
    return {
        description: (locales: Locales, context: Context) =>
            locales.concretize(accessor, {
                expected: new NodeRef(expectedType, locales, context),
            }),
        mediator: (context: Context) => {
            return {
                newProject: context.project.withRevisedNodes([
                    [target, replacement],
                ]),
                newNode: replacement,
            };
        },
    };
}
