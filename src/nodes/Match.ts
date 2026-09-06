import conciseRef from '@nodes/conciseRef';
import type { TemplateInput } from '@locale/Locales';
import { Purpose } from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import IncompatibleType from '@conflicts/IncompatibleType';
import type { ReplaceContext } from '@edit/revision/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { MATCH_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Jump from '@runtime/Jump';
import JumpIfUnequal from '@runtime/JumpIfEqual';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import type Context from '@nodes/Context';
import Expression, { type GuardContext } from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import KeyValue from '@nodes/KeyValue';
import { list, node, type Grammar, type Replacement } from '@nodes/Node';
import compileStreamWarmup from '@nodes/streamWarmup';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import { getEqualityTypes, narrowToEqual } from '@nodes/typeGuards';
import RangeType from '@nodes/RangeType';
import UnionType from '@nodes/UnionType';

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
            // Sym.Match, matching the tokenizer: Sym.BooleanType printed the same `???` but
            // reparsed differently, so the menu's soundness gate dropped it.
            new Token(MATCH_SYMBOL, Sym.Match),
            cases ?? [
                KeyValue.make(
                    ExpressionPlaceholder.make(),
                    ExpressionPlaceholder.make(),
                ),
            ],
            other ?? ExpressionPlaceholder.make(),
        );
    }

    static getPossibleReplacements({ node }: ReplaceContext) {
        // The selected expression becomes the value being matched — that's what "wrap in a
        // match" means. Putting it in the default slot instead left the value a placeholder,
        // so the match's type was unknown and every expected type filtered it out.
        return node instanceof Expression ? [Match.make(node)] : [];
    }

    static getPossibleInsertions() {
        return [];
    }

    isUndelimited() {
        return true;
    }

    getDescriptor(): NodeDescriptor {
        return 'Match';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'value',
                kind: node(Expression),
                label: () => (l) => l.glossary.value.word,
            },
            {
                name: 'question',
                kind: node(Sym.Match),
                space: true,
                label: undefined,
            },
            {
                name: 'cases',
                kind: list(true, node(KeyValue)),
                space: true,
                indent: true,
                newline: true,
                initial: true,
                label: () => (l) => l.node.Match.label.case,
            },
            {
                name: 'other',
                kind: node(Expression),
                label: () => (l) => l.node.Match.label.other,
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
        return Purpose.Decisions;
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = [];

        // Ensure that the corresponding values have a compatible type with the value.
        const valueType = this.value.getType(context).generalize(context);
        const valueIsCorrupt = context.isUnknownDownstream(this.value);

        for (const corresponding of this.cases) {
            const givenType = corresponding.key.getType(context);
            // A range key matches the numbers it holds rather than equalling the subject,
            // so it's compatible when the subject is one of those numbers — which is also
            // what makes a unit mismatch (`5 ??? 1s‥10s`) a conflict.
            const keyType =
                givenType instanceof RangeType
                    ? givenType.getElementType(context)
                    : givenType;
            if (
                !valueIsCorrupt &&
                !context.isUnknownDownstream(corresponding.key) &&
                !valueType.accepts(keyType, context)
            )
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
        // We precompile the results so we know how far to jump ater each.
        const conditions = this.cases.map((condition) =>
            condition.key.compile(evaluator, context),
        );
        const results = this.cases.map((condition) =>
            condition.value.compile(evaluator, context),
        );
        const other = this.other.compile(evaluator, context);

        // Pre-evaluate stream-creating calls in any case key, case value, or
        // the other branch so streams referenced in branches that aren't
        // chosen on first evaluation still come into existence. Without this,
        // short-circuiting jumps below leave them uncreated and the program
        // has nothing to react to. See streamWarmup.ts for details.
        const warmup = compileStreamWarmup(this, evaluator, context, [
            ...this.cases.flatMap((kv) => [kv.key, kv.value]),
            this.other,
        ]);

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
                // Land on the Finish, not past it: jump(n) adds n and the step
                // loop then advances one more, so the count must exclude the
                // Finish itself. Overshooting it skipped Match.evaluate on every
                // matched branch, which left the subject on the stack.
                count += other.length;
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
            // Warm up stream creators in any branch (issue #679)
            ...warmup,
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

        // Two values are on the stack: the chosen branch's result, and beneath
        // it the subject, which each JumpIfUnequal peeked at rather than popped
        // so the next case could compare against it too. Nothing else will ever
        // take the subject off, and a value left behind shifts every later pop
        // in the enclosing evaluation — Block.collect pops one value per
        // statement, so a leaked value hands a block's results somebody else's
        // value.
        const result = evaluator.popValue(this);
        evaluator.popValue(this);
        return result;
    }

    /**
     * Narrowing is recorded by node identity, so anything this doesn't visit keeps the
     * unnarrowed type — which meant a name narrowed by an enclosing conditional lost its
     * narrowing merely by being used inside a match. Reaching the cases takes explicit
     * work, because `KeyValue` extends `Node`, not `Expression`.
     */
    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        // The subject is evaluated before any case, so it sees the incoming types.
        this.value.evaluateTypeGuards(current, guard);

        // Only the subject's own equality says anything about the guarded value.
        const deciding = this.value.isGuardMatch(guard);

        // What the subject may still be. A case is only reached once every earlier
        // case failed to match, so each one sees less than the last.
        let remaining = current;

        for (const kv of this.cases) {
            // A key is evaluated before its value, and before later keys.
            kv.key.evaluateTypeGuards(remaining, guard);

            const equality = deciding
                ? getEqualityTypes(kv.key, guard.context)
                : undefined;

            kv.value.evaluateTypeGuards(
                equality
                    ? narrowToEqual(remaining, equality.types, guard.context)
                    : remaining,
                guard,
            );

            // A key whose value we can't name rules nothing out — we can't subtract a
            // type we can't determine — and neither can a multi-translation literal,
            // where only the reader's translation was actually compared. Subtracting
            // nothing keeps the fallback honest rather than confidently wrong.
            if (equality?.exclusive) {
                const rest = remaining.difference(
                    equality.types,
                    guard.context,
                );
                // Cases that between them cover the subject leave the fallback
                // unreachable. That's true but useless to say: with no unreachable-case
                // conflict to report, an empty set here only makes working code look
                // broken.
                if (rest.size() > 0) remaining = rest;
            }
        }

        this.other.evaluateTypeGuards(remaining, guard);

        // A match's value is arbitrary, so it asserts nothing about the guarded name.
        return current;
    }

    /** A match decides by equality on its subject, so it narrows. */
    guardsTypes() {
        return true;
    }

    /** Start node to highlight is the value expression token */
    getStart() {
        return this.value;
    }

    /** Last node to highlight is the question token */
    getFinish() {
        return this.question;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Match;
    getLocalePath() {
        return Match.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.Match.start, {
            value: new NodeRef(this.value, locales, context),
        });
    }

    getFinishExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.Match.finish);
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            value: conciseRef(this.value, locales, context),
            count: this.cases.length,
        };
    }

    getCharacter() {
        return Characters.Match;
    }
}
