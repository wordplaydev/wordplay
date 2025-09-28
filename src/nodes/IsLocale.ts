import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { LOCALE_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import StartFinish from '@runtime/StartFinish';
import type Step from '@runtime/Step';
import BoolValue from '@values/BoolValue';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import BooleanType from './BooleanType';
import type Expression from './Expression';
import Language from './Language';
import { node, optional, type Grammar, type Replacement } from './Node';
import SimpleExpression from './SimpleExpression';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';

export default class IsLocale extends SimpleExpression {
    readonly globe: Token;
    readonly locale: Language | undefined;

    constructor(globe: Token, locale: Language | undefined) {
        super();

        this.globe = globe;
        this.locale = locale;

        this.computeChildren();
    }

    static make(language?: Language) {
        return new IsLocale(new Token(LOCALE_SYMBOL, Sym.Change), language);
    }

    static getPossibleReplacements() {
        return [IsLocale.make(Language.make('en'))];
    }

    static getPossibleAppends() {
        return [IsLocale.make(Language.make('en'))];
    }

    getDescriptor(): NodeDescriptor {
        return 'IsLocale';
    }

    getGrammar(): Grammar {
        return [
            { name: 'globe', kind: node(Sym.Locale), label: undefined },
            {
                name: 'locale',
                kind: optional(node(Language)),
                label: () => (l) => l.term.language,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new IsLocale(
            this.replaceChild('globe', this.globe, replace),
            this.replaceChild('locale', this.locale, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Decide;
    }

    computeConflicts() {
        return [];
    }

    computeType(): Type {
        // The type is a boolean.
        return BooleanType.make();
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return new BoolValue(
            this,
            this.locale === undefined
                ? false
                : this.locale.region === undefined
                  ? evaluator
                        .getLocaleIDs()
                        .some((locale) => this.locale?.isLocaleLanguage(locale))
                  : evaluator
                        .getLocaleIDs()
                        .some((locale) => this.locale?.isLocale(locale)),
        );
    }

    getDependencies(): Expression[] {
        return [];
    }
    evaluateTypeGuards(current: TypeSet): TypeSet {
        return current;
    }

    getStart() {
        return this.locale ?? this.globe;
    }

    getFinish() {
        return this.locale ?? this.globe;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.IsLocale;
    getLocalePath() {
        return IsLocale.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize(
            (l) => l.node.IsLocale.start,
            this.locale?.toWordplay() ?? '-',
        );
    }

    getCharacter() {
        return Characters.Locale;
    }
}
