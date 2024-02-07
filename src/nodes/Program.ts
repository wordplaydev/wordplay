import type Definition from './Definition';
import Borrow from './Borrow';
import Block, { BlockKind } from '@nodes/Block';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import Token from './Token';
import type Context from './Context';
import type Node from './Node';
import Language from './Language';
import Unit from './Unit';
import Dimension from './Dimension';
import Docs from './Docs';
import { BorrowCycle } from '@conflicts/BorrowCycle';
import Expression, { ExpressionKind } from './Expression';
import type Type from './Type';
import type TypeSet from './TypeSet';
import type Value from '@values/Value';
import { node, type Grammar, type Replacement, optional, list } from './Node';
import type LanguageCode from '@locale/LanguageCode';
import Sym from './Sym';
import Glyphs from '../lore/Glyphs';
import BlankException from '@values/BlankException';
import concretize from '../locale/concretize';
import Purpose from '../concepts/Purpose';
import ValueRef from '../locale/ValueRef';
import type Locales from '../locale/Locales';

export default class Program extends Expression {
    readonly docs?: Docs;
    readonly borrows: Borrow[];
    readonly expression: Block;
    readonly end: Token | undefined;

    constructor(
        docs: Docs | undefined,
        borrows: Borrow[],
        expression: Block,
        end: Token | undefined,
    ) {
        super();

        this.docs = docs;
        this.borrows = borrows.slice();
        this.expression = expression;
        this.end = end;

        this.computeChildren();
    }

    static make(expressions: Expression[] = []) {
        return new Program(
            undefined,
            [],
            new Block(expressions, BlockKind.Root),
            new Token('', Sym.End),
        );
    }

    getDescriptor() {
        return 'Program';
    }

    getGrammar(): Grammar {
        return [
            { name: 'docs', kind: optional(node(Docs)) },
            { name: 'borrows', kind: list(true, node(Borrow)) },
            { name: 'expression', kind: node(Block) },
            { name: 'end', kind: optional(node(Sym.End)) },
        ];
    }

    getPurpose() {
        return Purpose.Source;
    }

    clone(replace?: Replacement) {
        return new Program(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('borrows', this.borrows, replace),
            this.replaceChild('expression', this.expression, replace),
            this.replaceChild('end', this.end, replace),
        ) as this;
    }

    isEmpty() {
        return this.leaves().length === 1;
    }

    isEvaluationInvolved() {
        return true;
    }
    getScopeOfChild(child: Node, context: Context): Node | undefined {
        return child === this.expression ? this : this.getParent(context);
    }

    computeConflicts(context: Context) {
        const [borrow, cycle] = context.source.getCycle(context) ?? [];
        if (borrow && cycle) return [new BorrowCycle(this, borrow, cycle)];
    }

    /** A program's type is it's block's type. */
    computeType(context: Context): Type {
        return this.expression.getType(context);
    }

    evaluateTypeGuards(current: TypeSet): TypeSet {
        return current;
    }

    getDefinitions(_: Node, context: Context): Definition[] {
        const definitions = [];

        for (const borrow of this.borrows) {
            const [source, definition] = borrow.getShare(context) ?? [];
            if (source === undefined) {
                if (definition !== undefined) definitions.push(definition);
            } else
                definitions.push(
                    definition === undefined ? source : definition,
                );
        }
        return definitions;
    }

    getLanguagesUsed(): LanguageCode[] {
        return Array.from(
            new Set(
                (
                    this.nodes(
                        (n): n is Language =>
                            n instanceof Language &&
                            n.getLanguageText() !== undefined,
                    ) as Language[]
                )
                    .map((n) => n.getLanguageCode())
                    .filter((l): l is LanguageCode => l !== undefined),
            ),
        );
    }

    getUnitsUsed(): Unit[] {
        return this.nodes((n): n is Unit => n instanceof Unit);
    }
    getDimensionsUsed(): Dimension[] {
        return this.nodes((n): n is Dimension => n instanceof Dimension);
    }

    getDependencies(): Expression[] {
        return [...this.borrows, this.expression];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        // Execute the borrows, then the block, then this.
        return [
            new Start(this),
            ...this.borrows.reduce(
                (steps: Step[], borrow) => [...steps, ...borrow.compile()],
                [],
            ),
            ...this.expression.compile(evaluator, context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Get whatever the block computed.
        const value = evaluator.popValue(this);

        // If the block is empty, than rather than return an expected value expression,
        // return a more helpful "emtpy program" exception, then provides some guidance.
        // Otherwise, return whatever the block computed.
        return this.expression.statements.length > 0
            ? value
            : new BlankException(evaluator, this);
    }

    getStart() {
        return this.getFirstLeaf() ?? this.expression;
    }

    getFinish() {
        return this.end ?? this.expression;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Program);
    }

    getStartExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        const reaction = evaluator.getReactionPriorTo(evaluator.getStepIndex());
        const change = reaction && reaction.changes.length > 0;

        return concretize(
            locales,
            locales.get((l) => l.node.Program.start),
            change
                ? new ValueRef(reaction.changes[0].stream, locales, context)
                : undefined,
            change
                ? new ValueRef(reaction.changes[0].value, locales, context)
                : undefined,
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.Program.finish),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.Program;
    }

    getKind() {
        return ExpressionKind.Simple;
    }
}
