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
import Expression from './Expression';
import type Bind from './Bind';
import type Type from './Type';
import type TypeSet from './TypeSet';
import type Value from '@runtime/Value';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import type LanguageCode from '@locale/LanguageCode';
import TokenType from './TokenType';
import ValueLink from '@locale/ValueLink';
import Glyphs from '../lore/Glyphs';
import BlankException from '../runtime/BlankException';

export default class Program extends Expression {
    readonly docs?: Docs;
    readonly borrows: Borrow[];
    readonly expression: Block;
    readonly end: Token;

    constructor(
        docs: Docs | undefined,
        borrows: Borrow[],
        expression: Block,
        end: Token
    ) {
        super();

        this.docs = docs;
        this.borrows = borrows.slice();
        this.expression = expression;
        this.end = end;

        this.computeChildren();
    }

    static make() {
        return new Program(
            undefined,
            [],
            new Block([], BlockKind.Root),
            new Token('', TokenType.End)
        );
    }

    getGrammar() {
        return [
            { name: 'docs', types: [Docs, undefined] },
            { name: 'borrows', types: [[Borrow]] },
            { name: 'expression', types: [Block] },
            { name: 'end', types: [Token] },
        ];
    }

    clone(replace?: Replacement) {
        return new Program(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('borrows', this.borrows, replace),
            this.replaceChild('expression', this.expression, replace),
            this.replaceChild('end', this.end, replace)
        ) as this;
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
                        (n) =>
                            n instanceof Language &&
                            n.getLanguage() !== undefined
                    ) as Language[]
                )
                    .map((n) => n.getLanguageCode())
                    .filter((l): l is LanguageCode => l !== undefined)
            )
        );
    }

    getUnitsUsed(): Unit[] {
        return this.nodes((n) => n instanceof Unit) as Unit[];
    }
    getDimensionsUsed(): Dimension[] {
        return this.nodes((n) => n instanceof Dimension) as Dimension[];
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
        return this.expression.statements.length === 0
            ? new BlankException(evaluator, this)
            : value;
    }

    getStart() {
        return this.getFirstLeaf() ?? this.end;
    }

    getFinish() {
        return this.end;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Program;
    }

    getStartExplanations(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        const reaction = evaluator.getReactionPriorTo(evaluator.getStepIndex());

        return translation.node.Program.start(
            reaction
                ? reaction.changes.map((change) => {
                      return {
                          stream: new ValueLink(
                              change.stream,
                              translation,
                              context
                          ),
                          value: new ValueLink(
                              change.value,
                              translation,
                              context
                          ),
                      };
                  })
                : []
        );
    }

    getFinishExplanations(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return translation.node.Program.finish(
            this.getValueIfDefined(translation, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Program;
    }
}
