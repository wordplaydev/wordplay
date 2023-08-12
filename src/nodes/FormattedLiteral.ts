import type { Grammar, Replacement } from './Node';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node, { list, node } from './Node';
import Literal from './Literal';
import type Value from '../values/Value';
import type Bind from './Bind';
import type Type from './Type';
import type TypeSet from './TypeSet';
import concretize from '../locale/concretize';
import MarkupValue from '@values/MarkupValue';
import FormattedType from './FormattedType';
import { getPreferred } from './LanguageTagged';
import FormattedTranslation from './FormattedTranslation';
import type Expression from './Expression';
import type Context from './Context';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import type Step from '@runtime/Step';
import type Evaluator from '@runtime/Evaluator';
import Token from './Token';
import Symbol from './Symbol';
import TextValue from '../values/TextValue';

export default class FormattedLiteral extends Literal {
    readonly texts: FormattedTranslation[];

    constructor(texts: FormattedTranslation[]) {
        super();

        this.texts = texts;

        this.computeChildren();
    }

    static getPossibleNodes() {
        return [new FormattedLiteral([FormattedTranslation.make()])];
    }

    getGrammar(): Grammar {
        return [{ name: 'texts', kind: list(node(FormattedTranslation)) }];
    }

    clone(replace?: Replacement) {
        return new FormattedLiteral(
            this.replaceChild<FormattedTranslation[]>(
                'texts',
                this.texts,
                replace
            )
        ) as this;
    }

    getPurpose() {
        return Purpose.Value;
    }

    computeConflicts() {
        return [];
    }

    getDependencies(): Expression[] {
        return this.texts
            .map((text) =>
                text.getExamples().map((ex) => ex.program.expression)
            )
            .flat();
    }

    compile(context: Context): Step[] {
        const text = this.getPreferredText(context.project.locales);
        // Choose a locale, compile its expressions, and then construct a string from the results.
        return [
            new Start(this),
            ...text
                .getExamples()
                .reduce(
                    (parts: Step[], part) => [
                        ...parts,
                        ...part.program.expression.compile(context),
                    ],
                    []
                ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const translation = this.getPreferredText(evaluator.project.locales);
        const expressions = translation.getExamples();

        let concrete = translation;
        for (let i = expressions.length - 1; i >= 0; i--) {
            const example = concrete.getExamples()[i];
            const value = evaluator.popValue(this);
            const text =
                value instanceof TextValue
                    ? value.text
                    : value?.toString() ?? '';
            concrete = concrete.replace(example, new Token(text, Symbol.Words));
        }

        return new MarkupValue(this, concrete.markup);
    }

    getTags(): FormattedTranslation[] {
        return this.texts;
    }

    getPreferredText(preferred: Locale | Locale[]): FormattedTranslation {
        // Build the list of preferred languages
        const locales = Array.isArray(preferred) ? preferred : [preferred];

        return getPreferred(locales, this.texts);
    }

    getNodeLocale(locale: Locale) {
        return locale.node.FormattedLiteral;
    }

    getGlyphs() {
        return Glyphs.Formatted;
    }

    getValue(locales: Locale[]): Value {
        const preferred = this.getPreferredText(locales);
        return new MarkupValue(this, preferred.markup);
    }

    computeType(): Type {
        return FormattedType.make();
    }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet {
        return current;
    }

    getStart(): Node {
        return this.texts[0];
    }

    getFinish(): Node {
        throw this.texts[this.texts.length - 1];
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.FormattedLiteral.start);
    }
}
