import type Definition from './Definition';
import Borrow from './Borrow';
import Block from '../nodes/Block';
import type Evaluator from '../runtime/Evaluator';
import type Step from '../runtime/Step';
import Finish from '../runtime/Finish';
import Start from '../runtime/Start';
import Token from './Token';
import type Context from './Context';
import type Node from './Node';
import Language from './Language';
import Unit from './Unit';
import Dimension from './Dimension';
import Docs from './Docs';
import TokenType from './TokenType';
import { BorrowCycle } from '../conflicts/BorrowCycle';
import Expression from './Expression';
import type Bind from './Bind';
import type Type from './Type';
import type TypeSet from './TypeSet';
import type Value from '../runtime/Value';
import type { Replacement } from './Node';
import type Translation from '../translations/Translation';

export default class Program extends Expression {
    readonly docs?: Docs;
    readonly borrows: Borrow[];
    readonly expression: Block;
    readonly end: Token;

    constructor(
        docs: Docs | undefined,
        borrows: Borrow[],
        expression: Block,
        end?: Token
    ) {
        super();

        this.docs = docs;
        this.borrows = borrows.slice();
        this.expression = expression;
        this.end = end ?? new Token('', TokenType.END);

        this.computeChildren();
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

    getLanguagesUsed(): string[] {
        return Array.from(
            new Set(
                (
                    this.nodes(
                        (n) =>
                            n instanceof Language &&
                            n.getLanguage() !== undefined
                    ) as Language[]
                ).map((n) => n.getLanguage() as string)
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

        // Return the value.
        return value;
    }

    getStart() {
        return this.getFirstLeaf() ?? this.end;
    }

    getFinish() {
        return this.end;
    }

    getNodeTranslation(translation: Translation) {
        return translation.expressions.Program;
    }

    getStartExplanations(translation: Translation) {
        return translation.expressions.Program.start;
    }

    getFinishExplanations(translation: Translation) {
        return translation.expressions.Program.finish;
    }
}
