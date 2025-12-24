import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { MAX_LINE_LENGTH } from '@parser/Spaces';
import { SET_CLOSE_SYMBOL, SET_OPEN_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import SetValue from '@values/SetValue';
import type Value from '@values/Value';
import type { BasisTypeName } from '../basis/BasisConstants';
import Purpose from '../concepts/Purpose';
import type Conflict from '../conflicts/Conflict';
import UnclosedDelimiter from '../conflicts/UnclosedDelimiter';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import AnyType from './AnyType';
import CompositeLiteral from './CompositeLiteral';
import type Context from './Context';
import Expression, { type GuardContext } from './Expression';
import { list, node, type Grammar, type Replacement } from './Node';
import SetCloseToken from './SetCloseToken';
import SetType from './SetType';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import UnionType from './UnionType';

export default class SetLiteral extends CompositeLiteral {
    readonly open: Token;
    readonly values: Expression[];
    readonly close: Token | undefined;
    readonly literal: Token | undefined;

    constructor(
        open: Token,
        values: Expression[],
        close: Token | undefined,
        literal?: Token,
    ) {
        super();

        this.open = open;
        this.values = values;
        this.close = close;
        this.literal = literal;

        this.computeChildren();
    }

    static make(values?: Expression[]) {
        return new SetLiteral(
            new Token(SET_OPEN_SYMBOL, Sym.SetOpen),
            values ?? [],
            new Token(SET_CLOSE_SYMBOL, Sym.SetClose),
        );
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions() {
        return [SetLiteral.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'SetLiteral';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.SetOpen), label: undefined },
            {
                name: 'values',
                kind: list(true, node(Expression)),
                label: () => (l) => l.term.value,
                // Only allow types to be inserted that are of the list's type, if provided.
                getType: (context) =>
                    this.getItemType(context) ?? new AnyType(),
                space: true,
                newline: this.wrap(),
                initial: true,
                indent: true,
            },
            {
                name: 'close',
                kind: node(Sym.SetClose),
                newline: this.wrap(),
                label: undefined,
            },
            { name: 'literal', kind: node(Sym.Literal), label: undefined },
        ];
    }

    wrap(): boolean {
        return (
            this.values.reduce(
                (sum, value) => sum + value.toWordplay().length,
                0,
            ) > MAX_LINE_LENGTH
        );
    }

    clone(replace?: Replacement) {
        return new SetLiteral(
            this.replaceChild('open', this.open, replace),
            this.replaceChild<Expression[]>('values', this.values, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('literal', this.literal, replace),
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Hidden;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'set';
    }

    computeConflicts(): Conflict[] {
        return this.close === undefined
            ? [new UnclosedDelimiter(this, this.open, new SetCloseToken())]
            : [];
    }

    getItemType(context: Context) {
        return this.values.length === 0
            ? undefined
            : UnionType.getPossibleUnion(
                  context,
                  this.values.map((v) => (v as Expression).getType(context)),
              );
    }

    computeType(context: Context): Type {
        // Generate a union type from all the values.
        const union = SetType.make(this.getItemType(context));
        // If literal, return the union, otherwise generalize it.
        return this.literal ? union : union.generalize(context);
    }

    getDependencies(): Expression[] {
        return [...this.values];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            // Evaluate all of the item or key/value expressions
            ...this.values.reduce(
                (steps: Step[], item) => [
                    ...steps,
                    ...(item as Expression).compile(evaluator, context),
                ],
                [],
            ),
            // Then build the set or map.
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Pop all of the values. Order doesn't matter.
        const values = [];
        for (let i = 0; i < this.values.length; i++)
            values.unshift(evaluator.popValue(this));
        return new SetValue(this, values);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        this.values.forEach((val) => {
            if (val instanceof Expression)
                val.evaluateTypeGuards(current, guard);
        });
        return current;
    }

    getStart() {
        return this.open;
    }

    getFinish() {
        return this.close ?? this.values[this.values.length - 1] ?? this.open;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.SetLiteral;
    getLocalePath() {
        return SetLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.SetLiteral.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.SetLiteral.finish,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getDescriptionInputs() {
        return [this.values.length];
    }

    getCharacter() {
        return Characters.Set;
    }
}
