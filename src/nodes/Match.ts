import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Step from '@runtime/Step';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { MATCH_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import { node, type Grammar, type Replacement, list } from './Node';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import type Locales from '../locale/Locales';
import KeyValue from './KeyValue';
import Glyphs from '../lore/Glyphs';
import Purpose from '@concepts/Purpose';
import UnionType from './UnionType';
import NodeRef from '@locale/NodeRef';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import JumpIfUnequal from '@runtime/JumpIfEqual';
import Jump from '@runtime/Jump';
import IncompatibleType from '@conflicts/IncompatibleType';
import type EditContext from '@edit/EditContext';

/**
 * A condition for any value, like a switch statement in other languages. For example:
 *
 * num ???
 *   1: 'st'
 *   2: 'nd'
 *   3: 'rd'
 *      'th'
 *
 * If num were 1, this expression would evaluate to 'st'.
 */
export default class Match extends Expression {
    readonly value: Expression;
    readonly question: Token;
    readonly cases: KeyValue[];
    readonly other: Expression;

    constructor(
        value: Expression,
        question: Token,
        cases: KeyValue[],
        other: Expression,
    ) {
        super();

        this.value = value;
        this.question = question;
        this.cases = cases;
        this.other = other;

        this.computeChildren();
    }

    static make(value?: Expression, cases?: KeyValue[], other?: Expression) {
        return new Match(
            value ?? ExpressionPlaceholder.make(),
            new Token(MATCH_SYMBOL, Sym.BooleanType),
            cases ?? [
                KeyValue.make(
                    ExpressionPlaceholder.make(),
                    ExpressionPlaceholder.make(),
                ),
            ],
            other ?? ExpressionPlaceholder.make(),
        );
    }

    static getPossibleReplacements({ node }: EditContext) {
        return [Match.make(node instanceof Expression ? node : undefined)];
    }

    static getPossibleAppends() {
        return [Match.make()];
    }

    getDescriptor() {
        return 'Match';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'value',
                kind: node(Expression),
                label: (locales: Locales) =>
                    locales.get((l) => l.node.Match.value),
            },
            {
                name: 'question',
                kind: node(Sym.Match),
                space: true,
            },
            {
                name: 'cases',
                kind: list(true, node(KeyValue)),
                space: true,
                indent: true,
                newline: true,
                initial: true,
            },
            {
                name: 'other',
                kind: node(Expression),
                label: (locales: Locales) =>
                    locales.get((l) => l.node.Match.other),
                space: true,
                indent: true,
                newline: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Match(
            this.replaceChild('value', this.value, replace),
            this.replaceChild<Token>('question', this.question, replace),
            this.replaceChild<KeyValue[]>('cases', this.cases, replace),
            this.replaceChild<Expression>('other', this.other, replace),
        ) as this;
    }

    hasBranch(expr: Expression) {
        return this.value === expr;
    }

    getPurpose() {
        return Purpose.Decide;
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        // Ensure that the corresponding values have a compatible type with the value.
        const valueType = this.value.getType(context).generalize(context);

        for (const corresponding of this.cases) {
            const givenType = corresponding.key.getType(context);
            if (!valueType.accepts(givenType, context))
                conflicts.push(
                    new IncompatibleType(
                        corresponding.key,
                        valueType,
                        this.value,
                        givenType,
                    ),
                );
        }

        return conflicts;
    }

    computeType(context: Context): Type {
        // The union of types of the case values.
        return UnionType.getPossibleUnion(context, [
            ...this.cases.map((kv) => kv.value.getType(context)),
            this.other.getType(context),
        ]);
    }

    /** It's value depends on the value checked and all of the key value expressions */
    getDependencies(): Expression[] {
        return [
            this.value,
            ...this.cases
                .map((kv) => {
                    return [kv.key, kv.value];
                })
                .flat(),
        ];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const value = this.value.compile(evaluator, context);

        // We precompile the results so we know how far to jump ater each.
        const conditions = this.cases.map((condition) =>
            condition.key.compile(evaluator, context),
        );
        const results = this.cases.map((condition) =>
            condition.value.compile(evaluator, context),
        );
        const other = this.other.compile(evaluator, context);

        // Compile the following pattern for each case:
        const cases: Step[] = this.cases
            .map((condition, index) => {
                const corresponding = conditions[index];
                const result = results[index];

                // Calculate the number of steps after this result, so we can jump past them.
                // Its the length of the condition, results, and the two conditionals.
                let count = 0;
                for (let i = index + 1; i < conditions.length; i++)
                    count += conditions[i].length + results[i].length + 2;
                count += other.length + 1;
                return [
                    // 1. Evaluate the corresponding value to compare
                    ...corresponding,
                    // 2. Peek at the value on the top of the stack and if it's not Value on the top of the stack is not equal to the condition, jump past the results steps to the next condition.
                    new JumpIfUnequal(this, result.length + 1),
                    // 3. Otherwise, evaluate the result expression,
                    ...result,
                    // 4. Then jump past the remaining steps
                    new Jump(count, this),
                ];
            })
            .flat();

        // Evaluate the condition, jump past the yes if false, otherwise evaluate the yes then jump past the no.
        return [
            // Start the expression
            new Start(this),
            // Evaluate the value to check
            ...this.value.compile(evaluator, context),
            // Evaluate all of the conditions generated above
            ...cases,
            // Evaluate the default expression if none of them matched
            ...other,
            // Finish the expression (see evaluate() below)
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // TODO Finish implementing evaluation.
        return evaluator.popValue(this);
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    /** Start node to highlight is the value expression token */
    getStart() {
        return this.value;
    }

    /** Last node to highlight is the question token */
    getFinish() {
        return this.question;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Match);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.Match.start,
            new NodeRef(this.value, locales, context),
        );
    }

    getFinishExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Match.finish);
    }

    getGlyphs() {
        return Glyphs.Match;
    }
}
