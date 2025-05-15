import type EditContext from '@edit/EditContext';
import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import MarkupValue from '@values/MarkupValue';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import TextValue from '../values/TextValue';
import type Value from '../values/Value';
import type Context from './Context';
import type Expression from './Expression';
import FormattedTranslation from './FormattedTranslation';
import FormattedType from './FormattedType';
import { getPreferred } from './LanguageTagged';
import Literal from './Literal';
import type { Grammar, Replacement } from './Node';
import Node, { list, node } from './Node';
import Paragraph from './Paragraph';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import Words from './Words';

export default class FormattedLiteral extends Literal {
    readonly texts: FormattedTranslation[];

    constructor(texts: FormattedTranslation[]) {
        super();

        this.texts = texts;

        this.computeChildren();
    }

    static getPossibleReplacements({ type, context }: EditContext) {
        return type !== undefined && type.accepts(FormattedType.make(), context)
            ? [new FormattedLiteral([FormattedTranslation.make()])]
            : [];
    }

    static getPossibleAppends(context: EditContext) {
        return this.getPossibleReplacements(context);
    }

    getDescriptor(): NodeDescriptor {
        return 'FormattedLiteral';
    }

    getGrammar(): Grammar {
        return [
            { name: 'texts', kind: list(false, node(FormattedTranslation)) },
        ];
    }

    clone(replace?: Replacement) {
        return new FormattedLiteral(
            this.replaceChild<FormattedTranslation[]>(
                'texts',
                this.texts,
                replace,
            ),
        ) as this;
    }

    getPurpose() {
        return Purpose.Value;
    }

    getOptions() {
        return this.texts;
    }

    withOption(text: FormattedTranslation) {
        return new FormattedLiteral([...this.texts, text]);
    }

    getLanguage(lang: LanguageCode) {
        return this.texts.find(
            (text) => text.language?.getLanguageCode() === lang,
        );
    }

    computeConflicts() {
        return [];
    }

    getDependencies(): Expression[] {
        return this.texts
            .map((text) =>
                text.getExamples().map((ex) => ex.program.expression),
            )
            .flat();
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const text = this.getPreferredText(evaluator.getLocaleIDs());
        // Choose a locale, compile its expressions, and then construct a string from the results.
        return [
            new Start(this),
            ...text
                .getExamples()
                .reduce(
                    (parts: Step[], part) => [
                        ...parts,
                        ...part.program.expression.compile(evaluator, context),
                    ],
                    [],
                ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const translation = this.getPreferredText(evaluator.getLocaleIDs());
        const expressions = translation.getExamples();

        let concrete = translation.markup;
        for (let i = expressions.length - 1; i >= 0; i--) {
            const example = translation.getExamples()[i];
            const value = evaluator.popValue(this);
            const text =
                // If it's text, just get the text
                value instanceof TextValue
                    ? value.text
                    : // If it's a markup value, use just the value
                      value instanceof MarkupValue
                      ? value
                      : // Otherwise, convert the value to a string for display.
                        (value.toString() ?? '');
            // Replace the markup's example with the computed markup paragraphs
            // Need to get the parent paragraph of the example so we can create a new list of segments.
            const container: Paragraph | Words | undefined = concrete
                .nodes()
                .find(
                    (p): p is Paragraph | Words =>
                        (p instanceof Paragraph &&
                            p.segments.includes(example)) ||
                        (p instanceof Words && p.segments.includes(example)),
                );
            if (container) {
                let index = container.segments.indexOf(example);
                if (index >= 0) {
                    let segments = [
                        ...container.segments.slice(0, index),
                        ...(typeof text === 'string'
                            ? [new Token(text, Sym.Words)]
                            : text.markup.getNodeSegments()),
                        ...container.segments.slice(index + 1),
                    ];
                    concrete = concrete.replace(
                        container,
                        container.withSegments(segments),
                    );
                }
            }
        }

        return new MarkupValue(this, concrete);
    }

    getTagged(): FormattedTranslation[] {
        return this.texts;
    }

    getPreferredText(preferred: Locale | Locale[]): FormattedTranslation {
        // Build the list of preferred languages
        const locales = Array.isArray(preferred) ? preferred : [preferred];

        return getPreferred(locales, this.texts);
    }

    static readonly LocalePath = (l: LocaleText) => l.node.FormattedLiteral;
    getLocalePath() {
        return FormattedLiteral.LocalePath;
    }

    getCharacter() {
        return Characters.Formatted;
    }

    getValue(locales: Locale[]): Value {
        const preferred = this.getPreferredText(locales);
        return new MarkupValue(this, preferred.markup);
    }

    computeType(): Type {
        return FormattedType.make();
    }

    evaluateTypeGuards(current: TypeSet): TypeSet {
        return current;
    }

    getStart(): Node {
        return this.texts[0];
    }

    getFinish(): Node {
        return this.texts[this.texts.length - 1];
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.FormattedLiteral.start);
    }
}
