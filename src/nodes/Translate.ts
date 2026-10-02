import conciseRef from '#nodes/conciseRef.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type Conflict from '#conflicts/Conflict.ts';
import { ExpectedCollection } from '#conflicts/ExpectedCollection.ts';
import { ExpectedThis } from '#conflicts/ExpectedThis.ts';
import type {
    InsertContext,
    ReplaceContext,
} from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { PROPERTY_SYMBOL, TRANSLATE_SYMBOL } from '#parser/Symbols.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Initialize from '#runtime/Initialize.ts';
import Internal from '#runtime/Internal.ts';
import Next from '#runtime/Next.ts';
import NextValue from '#runtime/NextValue.ts';
import Start from '#runtime/Start.ts';
import type Step from '#runtime/Step.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import TypeException from '#values/TypeException.ts';
import ValueException from '#values/ValueException.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import Characters from '../lore/BasisCharacters';
import AnyType from '#nodes/AnyType.ts';
import type Context from '#nodes/Context.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import ListType from '#nodes/ListType.ts';
import MapType from '#nodes/MapType.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import { NotAType } from '#nodes/NotAType.ts';
import SetType from '#nodes/SetType.ts';
import StructureType from '#nodes/StructureType.ts';
import { Sym } from '#nodes/Sym.ts';
import TableType from '#nodes/TableType.ts';
import This from '#nodes/This.ts';
import Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

/** Per-evaluation state tracked while a translate (↦) iterates a collection. */
type TranslateProgress = {
    collection: Value;
    items: Value[];
    index: number;
    results: Value[];
};

/** A typed wrapper so we can recover the state via `instanceof` without a cast. */
class TranslateInternal extends Internal<TranslateProgress> {}

/** The binding key under which the iteration state lives (non-identifier, so it can't collide with a user name). */
const StateKey = TRANSLATE_SYMBOL;

/**
 * Maps a collection: evaluates the right `translation` expression against each
 * item of the left collection, with `.` (This) bound to the current item, and
 * rebuilds a collection of the same kind. Equivalent to
 * `collection.translate(ƒ(item) translation)`.
 */
export default class Translate extends Expression {
    readonly expression: Expression;
    readonly translate: Token;
    readonly translation: Expression;

    constructor(
        expression: Expression,
        translate: Token,
        translation: Expression,
    ) {
        super();

        this.expression = expression;
        this.translate = translate;
        this.translation = translation;

        this.computeChildren();
    }

    static make(expression: Expression, translation: Expression) {
        return new Translate(
            expression,
            new Token(TRANSLATE_SYMBOL, Sym.Translate),
            translation,
        );
    }

    static getPossibleReplacements({ node, context }: ReplaceContext) {
        // Offer to map a collection: wrap it in a translate with a placeholder body.
        if (!(node instanceof Expression)) return [];
        const type = node.getType(context);
        // The body placeholder is typed with the collection's item type so the
        // resulting translate has the same kind of type as the input, letting
        // the suggestion pass the menu's type filter.
        const itemType =
            type instanceof ListType
                ? type.getItemType(context)
                : type instanceof SetType
                  ? type.key
                  : type instanceof MapType
                    ? type.value
                    : type instanceof TableType
                      ? new StructureType(type.definition, [])
                      : undefined;
        return type instanceof ListType ||
            type instanceof SetType ||
            type instanceof MapType ||
            type instanceof TableType
            ? [
                  Translate.make(
                      node,
                      ExpressionPlaceholder.make(itemType?.generalize(context)),
                  ),
              ]
            : [];
    }

    static getPossibleInsertions(_context: InsertContext) {
        return [];
    }

    getDescriptor(): NodeDescriptor {
        return 'Translate';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'expression',
                kind: node(Expression),
                label: (locales, context) => () =>
                    this.expression.getType(context).getLabel(locales),
            },
            {
                name: 'translate',
                kind: node(Sym.Translate),
                space: true,
                label: undefined,
            },
            {
                name: 'translation',
                kind: node(Expression),
                space: true,
                label: () => (l) => l.glossary.value.word,
            },
        ];
    }

    getPurpose() {
        return Purpose.Lists;
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new Translate(
                this.replaceChild('expression', this.expression, replace),
                this.replaceChild('translate', this.translate, replace),
                this.replaceChild('translation', this.translation, replace),
            ),
        );
    }

    /** The type of `.` (This) inside the translation body: the element/value/row type of the left collection. */
    getItemType(context: Context): Type {
        const leftType = this.expression.getType(context);
        if (leftType instanceof ListType)
            return leftType.getItemType(context) ?? new AnyType();
        if (leftType instanceof SetType) return leftType.key ?? new AnyType();
        if (leftType instanceof MapType) return leftType.value ?? new AnyType();
        if (leftType instanceof TableType)
            return new StructureType(leftType.definition, []);
        return new AnyType();
    }

    computeType(context: Context): Type {
        const leftType = this.expression.getType(context);
        const bodyType = this.translation.getType(context);
        if (leftType instanceof ListType) return ListType.make(bodyType);
        if (leftType instanceof SetType) return SetType.make(bodyType);
        if (leftType instanceof MapType)
            return MapType.make(leftType.key, bodyType);
        if (leftType instanceof TableType)
            return bodyType instanceof StructureType
                ? TableType.make(bodyType.definition.inputs)
                : leftType;
        return new NotAType(this, leftType, ListType.make());
    }

    computeConflicts(context: Context): Conflict[] {
        const leftType = this.expression.getType(context);
        const isCollection =
            leftType instanceof ListType ||
            leftType instanceof SetType ||
            leftType instanceof MapType ||
            leftType instanceof TableType;
        // The left has to be a collection.
        if (!isCollection) return [new ExpectedCollection(this, leftType)];
        // If it is, warn when the body has no `.` referring to the current item.
        // (Only reachable when there's no ExpectedCollection conflict.)
        return this.translation.nodes().some((n) => n instanceof This)
            ? []
            : [new ExpectedThis(this)];
    }

    getDependencies(): Expression[] {
        return [this.expression, this.translation];
    }

    isConstant() {
        return false;
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const body = this.translation.compile(evaluator, context);
        // The number of body steps determines the loop jump distances.
        const length = body.length;
        return [
            new Start(this),
            // Evaluate the collection, leaving its value on the stack.
            ...this.expression.compile(evaluator, context),
            // Initialize: scope locals, pop the collection, and set up tracking state.
            new Initialize(this, (evaluator) => {
                evaluator.getCurrentEvaluation()?.scope();
                const collection = evaluator.popValue(this);
                if (collection instanceof ExceptionValue) return collection;
                if (!collection.isCollection())
                    return new TypeException(
                        this,
                        evaluator,
                        ListType.make(),
                        collection,
                    );
                evaluator.bind(
                    StateKey,
                    new TranslateInternal(this, {
                        collection,
                        items: collection.getTranslationItems(),
                        index: 0,
                        results: [],
                    }),
                );
                return undefined;
            }),
            // For each item: bind `.` and run the body, or jump to the finish when done.
            new NextValue(this, (evaluator) => {
                const stored = evaluator.resolve(StateKey);
                if (!(stored instanceof TranslateInternal))
                    return new ValueException(evaluator, this);
                const state = stored.value;
                const item = state.items[state.index];
                if (item === undefined) {
                    // Skip the body and the accumulate step, landing on Finish.
                    evaluator.jump(length + 1);
                    return undefined;
                }
                evaluator.bind(PROPERTY_SYMBOL, item);
                return undefined;
            }),
            // The body, evaluated with `.` bound to the current item.
            ...body,
            // Accumulate the translated value and loop back to NextValue.
            new Next(this, (evaluator) => {
                const stored = evaluator.resolve(StateKey);
                if (!(stored instanceof TranslateInternal))
                    return new ValueException(evaluator, this);
                const state = stored.value;
                const result = evaluator.popValue(this);
                if (result instanceof ExceptionValue) return result;
                state.results.push(result);
                state.index = state.index + 1;
                evaluator.jump(-(length + 2));
                return undefined;
            }),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const stored = evaluator.resolve(StateKey);
        evaluator.getCurrentEvaluation()?.unscope();
        if (!(stored instanceof TranslateInternal))
            return new ValueException(evaluator, this);
        const state = stored.value;
        return state.collection.createTranslation(this, state.results);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        this.expression.evaluateTypeGuards(current, guard);
        this.translation.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.translate;
    }
    getFinish() {
        return this.translate;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Translate;
    getLocalePath() {
        return Translate.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize((l) => l.node.Translate.start, {
            expression: new NodeRef(this.expression, locales, context),
        });
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize((l) => l.node.Translate.finish, {
            value: this.getValueIfDefined(locales, context, evaluator),
        });
    }

    getDescriptionInputs(
        locales: Locales,
        context: Context,
    ): Record<string, TemplateInput> {
        return {
            expression: conciseRef(this.expression, locales, context),
        };
    }

    getCharacter() {
        return Characters.Translate;
    }
}
