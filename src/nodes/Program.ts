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
import type Bind from './Bind';
import type Type from './Type';
import type TypeSet from './TypeSet';
import type Value from '@values/Value';
import { node, type Grammar, type Replacement, optional, list } from './Node';
import type Locale from '@locale/Locale';
import type LanguageCode from '@locale/LanguageCode';
import Sym from './Sym';
import Glyphs from '../lore/Glyphs';
import BlankException from '@values/BlankException';
import concretize from '../locale/concretize';
import Purpose from '../concepts/Purpose';
import ValueRef from '../locale/ValueRef';

export default class Program extends Expression {
    readonly docs?: Docs;
    readonly borrows: Borrow[];
    readonly expression: Block;
    readonly end: Token | undefined;

    constructor(
        docs: Docs | undefined,
        borrows: Borrow[],
        expression: Block,
        end: Token | undefined
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
            new Token('', Sym.End)
        );
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
        return Purpose.Evaluate;
    }

    clone(replace?: Replacement) {
        return new Program(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('borrows', this.borrows, replace),
            this.replaceChild('expression', this.expression, replace),
            this.replaceChild('end', this.end, replace)
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

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet {
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
                    definition === undefined ? source : definition
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
                            n.getLanguageText() !== undefined
                    ) as Language[]
                )
                    .map((n) => n.getLanguageCode())
                    .filter((l): l is LanguageCode => l !== undefined)
            )
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

    compile(context: Context): Step[] {
        // Execute the borrows, then the block, then this.
        return [
            new Start(this),
            ...this.borrows.reduce(
                (steps: Step[], borrow) => [...steps, ...borrow.compile()],
                []
            ),
            ...this.expression.compile(context),
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

    getNodeLocale(translation: Locale) {
        return translation.node.Program;
    }

    getStartExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        const reaction = evaluator.getReactionPriorTo(evaluator.getStepIndex());
        const change = reaction && reaction.changes.length > 0;

        return concretize(
            locale,
            locale.node.Program.start,
            change
                ? new ValueRef(reaction.changes[0].stream, locale, context)
                : undefined,
            change
                ? new ValueRef(reaction.changes[0].value, locale, context)
                : undefined
        );
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.Program.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Program;
    }

    getKind() {
        return ExpressionKind.Simple;
    }
}
