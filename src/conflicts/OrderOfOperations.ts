import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Block from '@nodes/Block';
import type Expression from '@nodes/Expression';
import type Reference from '@nodes/Reference';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import {
    EXPONENT_SYMBOL,
    PRODUCT_SYMBOL,
    QUOTIENT_SYMBOL,
    DOT_SYMBOL,
    SUM_SYMBOL,
    DIFFERENCE_SYMBOL,
    EQUALS_SYMBOL,
    NOT_EQUALS_SYMBOL,
    AND_SYMBOL,
    OR_SYMBOL,
} from '@parser/Symbols';

/** PEMDAS-style precedence for binary operators. Higher number = evaluated
 *  earlier. Operators outside this table fall back to 0. */
function precedence(op: string): number {
    if (op === EXPONENT_SYMBOL) return 4;
    if (
        op === PRODUCT_SYMBOL ||
        op === DOT_SYMBOL ||
        op === QUOTIENT_SYMBOL ||
        op === '%'
    )
        return 3;
    if (op === SUM_SYMBOL || op === DIFFERENCE_SYMBOL) return 2;
    if (
        op === '<' ||
        op === '>' ||
        op === '≤' ||
        op === '≥' ||
        op === EQUALS_SYMBOL ||
        op === NOT_EQUALS_SYMBOL
    )
        return 1;
    if (op === AND_SYMBOL || op === OR_SYMBOL) return 0;
    return 0;
}

/** Standard math convention: `^` is right-associative (2^3^2 = 2^(3^2)). */
function isRightAssociative(op: string): boolean {
    return op === EXPONENT_SYMBOL;
}

export default class OrderOfOperations extends Conflict {
    readonly operation: BinaryEvaluate;
    readonly after: BinaryEvaluate;

    constructor(operation: BinaryEvaluate, after: BinaryEvaluate) {
        super(true);

        this.operation = operation;
        this.after = after;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.BinaryEvaluate.conflict.OrderOfOperations;

    getMessage() {
        return {
            node: this.operation,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => OrderOfOperations.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(context: Context, _concepts: Node[]): Resolutions {
        // Walk up from `this.after` while the parent is also a BinaryEvaluate
        // that uses the current node as its `left` — Wordplay's parse is
        // left-associative, so the entire arithmetic chain lives along the
        // leftmost spine of the topmost ancestor.
        let chainRoot: BinaryEvaluate = this.after;
        const source =
            context.project.getSourceOf(this.after) ?? context.source;
        const root = source.root;
        while (true) {
            const parent = root.getParent(chainRoot);
            if (parent instanceof BinaryEvaluate && parent.left === chainRoot)
                chainRoot = parent;
            else break;
        }

        // Flatten the chain into [operand_0, op_1, operand_1, op_2, …]. The
        // leftmost descent stops at any non-BinaryEvaluate (Block, literal,
        // Evaluate, …) — those are atoms that become operands as-is.
        const operands: Expression[] = [];
        const ops: Reference[] = [];
        let cur: Expression = chainRoot;
        while (cur instanceof BinaryEvaluate) {
            ops.unshift(cur.fun);
            operands.unshift(cur.right);
            cur = cur.left;
        }
        operands.unshift(cur);

        const operatorNames = ops.map((o) => o.getName());

        // Two repairs to consider. Both rebuild the chain in a way that
        // eliminates every OrderOfOperations conflict in the chain (because
        // BinaryEvaluate children get wrapped in Blocks, so the conflict's
        // `this.left instanceof BinaryEvaluate` check no longer matches).
        const pemdasTree = rebuildPEMDAS(operands, ops);
        const readingTree = rebuildReadingOrder(operands, ops);

        // If math order and reading order produce the same tree (e.g., the
        // chain is all same precedence, or already monotonically decreasing
        // in precedence left-to-right), only one meaningful repair exists —
        // collapse to a single "add parentheses" entry.
        const sameShape = pemdasTree.isEqualTo(readingTree);

        if (sameShape) {
            return [
                {
                    kind: 'repair',
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) =>
                                OrderOfOperations.LocalePath(l).resolutionWrap,
                        ),
                    mediator: (ctx) => ({
                        newProject: ctx.project.withRevisedNodes([
                            [chainRoot, pemdasTree],
                        ]),
                        newNode: pemdasTree,
                    }),
                },
            ];
        }

        // Math and reading order diverge. Identify the highest- and
        // lowest-precedence operators in the chain for the description text;
        // these are what the learner is most likely to see "move" in the
        // PEMDAS rebuild.
        const highestIdx = operatorNames.reduce(
            (best, _, i) =>
                precedence(operatorNames[i]) > precedence(operatorNames[best])
                    ? i
                    : best,
            0,
        );
        const lowestIdx = operatorNames.reduce(
            (best, _, i) =>
                precedence(operatorNames[i]) < precedence(operatorNames[best])
                    ? i
                    : best,
            0,
        );
        const higherRef = ops[highestIdx];
        const lowerRef = ops[lowestIdx];

        return [
            {
                kind: 'repair',
                description: (locales: Locales, ctx: Context) =>
                    locales.concretize(
                        (l) => OrderOfOperations.LocalePath(l).resolutionPEMDAS,
                        {
                            higher: new NodeRef(
                                higherRef,
                                locales,
                                ctx,
                                higherRef.getName(),
                            ),
                            lower: new NodeRef(
                                lowerRef,
                                locales,
                                ctx,
                                lowerRef.getName(),
                            ),
                        },
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [chainRoot, pemdasTree],
                    ]),
                    newNode: pemdasTree,
                }),
            },
            {
                kind: 'repair',
                description: (locales: Locales, ctx: Context) =>
                    locales.concretize(
                        (l) =>
                            OrderOfOperations.LocalePath(l).resolutionReading,
                        {
                            higher: new NodeRef(
                                higherRef,
                                locales,
                                ctx,
                                higherRef.getName(),
                            ),
                            lower: new NodeRef(
                                lowerRef,
                                locales,
                                ctx,
                                lowerRef.getName(),
                            ),
                        },
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [chainRoot, readingTree],
                    ]),
                    newNode: readingTree,
                }),
            },
        ];
    }

    getLocalePath() {
        return OrderOfOperations.LocalePath;
    }
}

/** Wrap a BinaryEvaluate in a Block so it round-trips through toWordplay
 *  unambiguously — without parens, Wordplay's left-associative parse would
 *  re-bind the operators differently. Atoms pass through. */
function wrapIfBinary(e: Expression): Expression {
    return e instanceof BinaryEvaluate ? Block.make([e]) : e;
}

/** Precedence-climbing rebuild. `^` is treated as right-associative; all
 *  others as left-associative. Every BinaryEvaluate child gets wrapped, so
 *  the resulting tree fires no OrderOfOperations conflicts. */
function rebuildPEMDAS(operands: Expression[], ops: Reference[]): Expression {
    let i = 0;
    function climb(minPrec: number): Expression {
        let lhs = operands[i];
        i++;
        while (i - 1 < ops.length) {
            const op = ops[i - 1];
            const opName = op.getName();
            const opPrec = precedence(opName);
            if (opPrec < minPrec) break;
            const nextMin = isRightAssociative(opName) ? opPrec : opPrec + 1;
            const rhs = climb(nextMin);
            lhs = new BinaryEvaluate(wrapIfBinary(lhs), op, wrapIfBinary(rhs));
        }
        return lhs;
    }
    return climb(0);
}

/** Left-associative rebuild, mirroring Wordplay's natural parse. Every
 *  BinaryEvaluate child gets wrapped so the conflicts disappear from the
 *  rebuilt tree (and so re-parsing preserves the structure). */
function rebuildReadingOrder(
    operands: Expression[],
    ops: Reference[],
): Expression {
    let lhs: Expression = operands[0];
    for (let i = 0; i < ops.length; i++) {
        lhs = new BinaryEvaluate(
            wrapIfBinary(lhs),
            ops[i],
            wrapIfBinary(operands[i + 1]),
        );
    }
    return lhs;
}
