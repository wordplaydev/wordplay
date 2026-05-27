import type Context from '@nodes/Context';
import type { Field, FieldKind } from '@nodes/Node';
import type Node from '@nodes/Node';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type UnparsableExpression from '@nodes/UnparsableExpression';
import type UnparsableType from '@nodes/UnparsableType';
import type Definition from '@nodes/Definition';

/**
 * A read-only snapshot of everything around an UnparsableExpression / UnparsableType
 * that helps infer what the programmer meant. Built once per call to
 * UnparsableConflict.getResolutions so the layered repair algorithm can consult it
 * without re-walking ancestors per candidate.
 */
export default class RepairContext {
    /** The unparsable node itself. */
    readonly unparsable: UnparsableExpression | UnparsableType;
    /** The wrapped Wordplay analysis context. */
    readonly context: Context;
    /** Tokens trapped inside the unparsable node. */
    readonly unparsableTokens: Token[];
    /** Field the unparsable occupies in its parent (if any). */
    readonly parentField: Field | undefined;
    /** Kind constraint declared by that field (e.g. Expression, Bind, Type). */
    readonly parentKind: FieldKind | undefined;
    /** Type the parent slot expects the value to satisfy (e.g. Bind.value with an annotation). */
    readonly expectedType: Type | undefined;
    /** Ancestor chain from immediate parent up to Source/Program. */
    readonly ancestors: Node[];
    /** Definitions in scope at the unparsable's position. */
    readonly scope: Definition[];
    /**
     * Tokens immediately before / after the unparsable on the same source line, in source order.
     * Used by the "widen the repair window" layer so we can pull in `:` or `•` that
     * sits just outside the unparsable.
     */
    readonly precedingLineTokens: Token[];
    readonly followingLineTokens: Token[];

    private constructor(
        unparsable: UnparsableExpression | UnparsableType,
        context: Context,
        unparsableTokens: Token[],
        parentField: Field | undefined,
        parentKind: FieldKind | undefined,
        expectedType: Type | undefined,
        ancestors: Node[],
        scope: Definition[],
        precedingLineTokens: Token[],
        followingLineTokens: Token[],
    ) {
        this.unparsable = unparsable;
        this.context = context;
        this.unparsableTokens = unparsableTokens;
        this.parentField = parentField;
        this.parentKind = parentKind;
        this.expectedType = expectedType;
        this.ancestors = ancestors;
        this.scope = scope;
        this.precedingLineTokens = precedingLineTokens;
        this.followingLineTokens = followingLineTokens;
    }

    static gather(
        unparsable: UnparsableExpression | UnparsableType,
        context: Context,
    ): RepairContext {
        const root = context.source.root;
        const parentField = root.getFieldOfChild(unparsable);
        const parentKind = parentField?.kind;
        const expectedType = (() => {
            const parent = root.getParent(unparsable);
            if (parent === undefined || parentField?.getType === undefined)
                return undefined;
            try {
                return parentField.getType(context, undefined);
            } catch {
                return undefined;
            }
        })();

        const ancestors: Node[] = [];
        let current: Node | undefined = root.getParent(unparsable);
        while (current !== undefined) {
            ancestors.push(current);
            current = root.getParent(current);
        }

        const scope = unparsable.getDefinitionsInScope(context);

        const [preceding, following] = RepairContext.collectAdjacentLineTokens(
            unparsable,
            context,
        );

        return new RepairContext(
            unparsable,
            context,
            // UnparsableExpression and UnparsableType both expose `unparsables`
            // (this field is duck-typed to avoid an import cycle).
            (unparsable as unknown as { unparsables: Token[] }).unparsables,
            parentField,
            parentKind,
            expectedType,
            ancestors,
            scope,
            preceding,
            following,
        );
    }

    /**
     * Tokens to use as "anchor context" alongside the unparsable's own tokens.
     * For a non-empty unparsable, this is the sibling tokens on the same source
     * line. For an empty unparsable (the parser consumed the anchor symbol and
     * left an empty UnparsableExpression in some slot — e.g. `←` parses into a
     * Previous whose `number` slot is an empty unparsable), we instead reach
     * for the immediate parent's tokens, which still carry the anchor the user
     * actually typed.
     *
     * Both lists collapse to the parent's non-unparsable tokens; preceding /
     * following ordering doesn't matter for anchor matching, so we don't try to
     * split them.
     */
    private static collectAdjacentLineTokens(
        unparsable: UnparsableExpression | UnparsableType,
        context: Context,
    ): [Token[], Token[]] {
        const parent = context.source.root.getParent(unparsable);
        if (parent === undefined) return [[], []];

        const ownTokens = new Set(
            unparsable.nodes((n): n is Token => n instanceof Token),
        );
        const siblingTokens = parent
            .nodes((n): n is Token => n instanceof Token)
            .filter((t) => !ownTokens.has(t));

        return [siblingTokens, []];
    }
}
