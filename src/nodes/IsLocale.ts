import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import Sym from './Sym';
import { LOCALE_SYMBOL } from '@parser/Symbols';
import BoolValue from '@values/BoolValue';
import { node, type Grammar, type Replacement, optional } from './Node';
import SimpleExpression from './SimpleExpression';
import BooleanType from './BooleanType';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Language from './Language';
import StartFinish from '@runtime/StartFinish';
import type Expression from './Expression';
import type TypeSet from './TypeSet';
import type Locales from '../locale/Locales';

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

    getDescriptor() {
        return 'IsLocale';
    }

    getGrammar(): Grammar {
        return [
            { name: 'globe', kind: node(Sym.Locale) },
            {
                name: 'locale',
                kind: optional(node(Language)),
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.IsLocale);
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize(
            (l) => l.node.IsLocale.start,
            this.locale?.toWordplay() ?? '-',
        );
    }

    getGlyphs() {
        return Glyphs.Locale;
    }
}
