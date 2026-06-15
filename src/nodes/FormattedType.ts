import type LocaleText from '@locale/LocaleText';
import type { BasisTypeName } from '@basis/BasisConstants';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Characters from '../lore/BasisCharacters';
import { FORMATTED_TYPE_SYMBOL } from '@parser/Symbols';
import BasisType from '@nodes/BasisType';
import type BinaryEvaluate from '@nodes/BinaryEvaluate';
import type Context from '@nodes/Context';
import {
    concreteLanguageOf,
    type LanguageDeriver,
} from '@nodes/DerivedLanguage';
import type Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import Language from '@nodes/Language';
import { node, optional, type Grammar, type Replacement } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';

/** We created this little factory to avoid a cycle in FormattedType's default expression creation. */
let _defaultFactory: (() => Expression) | undefined;
export function registerFormattedDefaultExpression(factory: () => Expression) {
    _defaultFactory = factory;
}

export default class FormattedType extends BasisType {
    readonly tick: Token;
    /** A concrete locale, a deriver computing one from operand locales, or none.
     *  A deriver is never a child node (guarded in clone), mirroring TextType. */
    readonly language: Language | LanguageDeriver | undefined;
    /** The operation whose operands feed a language deriver; set when concretizing. */
    readonly op: BinaryEvaluate | Evaluate | undefined;

    constructor(
        tick: Token,
        language?: Language | LanguageDeriver,
        op?: BinaryEvaluate | Evaluate,
    ) {
        super();

        this.tick = tick;
        this.language = language;
        this.op = op;
    }

    static make(format?: Language | LanguageDeriver) {
        return new FormattedType(
            new Token(FORMATTED_TYPE_SYMBOL, Sym.FormattedType),
            format,
        );
    }

    getDescriptor(): NodeDescriptor {
        return 'FormattedType';
    }

    getGrammar(): Grammar {
        return [
            { name: 'tick', kind: node(Sym.FormattedType), label: undefined },
            {
                name: 'language',
                kind: optional(node(Language)),
                label: () => (l) => l.term.language,
            },
        ];
    }

    hasDerivedLanguage() {
        return this.language instanceof Function;
    }

    withOp(op: BinaryEvaluate | Evaluate) {
        return new FormattedType(this.tick, this.language, op);
    }

    withLanguage(language: Language | undefined) {
        return new FormattedType(this.tick, language);
    }

    /** Resolve the concrete locale, evaluating a deriver against the operands'
     *  locales if necessary. Mirrors TextType.concreteLanguage. */
    concreteLanguage(context: Context): Language | undefined {
        return concreteLanguageOf(this.language, this.op, context);
    }

    acceptsAll(types: TypeSet, context: Context): boolean {
        const thisLanguage = this.concreteLanguage(context);
        return types.list().every((type) =>
            // Expand any union into its members (getPossibleTypes returns
            // [self] for concrete types), matching TextType — done via
            // getPossibleTypes rather than `instanceof UnionType` so this
            // module needn't import UnionType (which would create an init cycle).
            type.getPossibleTypes(context).every((possible) => {
                if (!(possible instanceof FormattedType)) return false;
                // Accept any locale, or require an exact match.
                const thatLanguage = possible.concreteLanguage(context);
                return (
                    thisLanguage === undefined ||
                    (thatLanguage !== undefined &&
                        thisLanguage.isEqualTo(thatLanguage))
                );
            }),
        );
    }

    generalize(): Type {
        return FormattedType.make(this.language);
    }

    getBasisTypeName(): BasisTypeName {
        return 'formatted';
    }

    computeConflicts() {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new FormattedType(
            this.replaceChild('tick', this.tick, replace),
            // A deriver isn't a child node, so pass it through untouched.
            this.language instanceof Function
                ? this.language
                : this.replaceChild('language', this.language, replace),
        ) as this;
    }

    getDefaultExpression() {
        return _defaultFactory?.();
    }

    getCharacter() {
        return Characters.Formatted;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.FormattedType;
    getLocalePath() {
        return FormattedType.LocalePath;
    }
}
