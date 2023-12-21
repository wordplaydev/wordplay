import TextType from './TextType';
import type Type from './Type';
import TextValue from '@values/TextValue';
import type Language from './Language';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { node, type Grammar, type Replacement, list } from './Node';
import type Locale from '@locale/Locale';
import Literal from './Literal';
import Emotion from '../lore/Emotion';
import type { BasisTypeName } from '../basis/BasisConstants';
import concretize from '../locale/concretize';
import type Node from './Node';
import Translation from './Translation';
import UnionType from './UnionType';
import { getPreferred } from './LanguageTagged';
import Token from './Token';
import Sym from './Sym';
import type Expression from './Expression';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import type Evaluator from '@runtime/Evaluator';
import type Value from '../values/Value';
import type Locales from '../locale/Locales';

export default class TextLiteral extends Literal {
    /** The list of translations for the text literal */
    readonly texts: Translation[];

    constructor(text: Translation[]) {
        super();

        this.texts = text;

        this.computeChildren();
    }

    static make(text?: string, language?: Language) {
        return new TextLiteral([Translation.make(text ?? '', language)]);
    }

    static getPossibleNodes(
        type: Type | undefined,
        before: Node,
        selected: boolean,
        context: Context,
    ) {
        // Is the type one or more literal text types? Suggest those. Otherwise just suggest an empty text literal.
        const types = type
            ? type
                  .getPossibleTypes(context)
                  .filter((type): type is TextType => type instanceof TextType)
            : undefined;
        return types
            ? types.map((type) => type.getLiteral())
            : [TextLiteral.make()];
    }

    getDescriptor() {
        return 'TextLiteral';
    }

    getGrammar(): Grammar {
        return [{ name: 'texts', kind: list(false, node(Translation)) }];
    }

    clone(replace?: Replacement): this {
        return new TextLiteral(
            this.replaceChild('texts', this.texts, replace),
        ) as this;
    }

    getAffiliatedType(): BasisTypeName {
        return 'text';
    }

    getDependencies(): Expression[] {
        return this.texts.map((text) => text.getExpressions()).flat();
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const text = this.getLocaleText(evaluator.getLocales());
        // Choose a locale, compile its expressions, and then construct a string from the results.
        return [
            new Start(this),
            ...text
                .getExpressions()
                .reduce(
                    (parts: Step[], part) => [
                        ...parts,
                        ...part.expression.compile(evaluator, context),
                    ],
                    [],
                ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const translation = this.getLocaleText(evaluator.getLocales());
        const expressions = translation.segments;

        // Build the string in reverse, accounting for the reversed stack of values.
        let text = '';
        for (let i = expressions.length - 1; i >= 0; i--) {
            const p = expressions[i];
            let next: string;
            if (p instanceof Token) {
                next = unescaped(p.getText());
            } else {
                const value = evaluator.popValue(this);
                next =
                    value instanceof TextValue
                        ? value.text
                        : value?.toString() ?? '';
            }
            // Assemble in reverse order
            text = next + text;
        }
        // Construct the text value.
        return new TextValue(
            this,
            text,
            translation.language?.getLanguageText(),
        );
    }

    computeConflicts() {
        return;
    }

    computeType(context: Context): Type {
        // A union of all of the literal types of each alternative.
        return UnionType.getPossibleUnion(
            context,
            this.texts.map((text) =>
                text.segments.length === 1 &&
                text.segments[0] instanceof Token &&
                text.segments[0].isSymbol(Sym.Words)
                    ? new TextType(
                          text.open.clone(),
                          text.segments[0].clone(),
                          text.close?.clone(),
                          text.language,
                      )
                    : TextType.make(),
            ),
        );
    }

    /** Get the text, with any escape characters processed. */
    getText(): string {
        // Replace any escapes with the character they're escaping
        return unescaped(this.texts[0].getText());
    }

    getLocaleText(locales: Locale[]) {
        return this.texts.length === 1
            ? this.texts[0]
            : getPreferred(locales, this.texts);
    }

    getValue(locales: Locales): TextValue {
        // Get the alternatives
        const best = this.getLocaleText(locales.getLocales());
        return new TextValue(
            this,
            best.getText(),
            best.language === undefined
                ? undefined
                : best.language.getLanguageText(),
        );
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getTags(): Translation[] {
        return this.texts;
    }

    getStart() {
        return this.texts[0];
    }

    getFinish() {
        return this.texts[0];
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.TextLiteral);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.TextLiteral.start),
        );
    }

    getGlyphs() {
        return {
            symbols: this.texts[0].getDelimiters(),
            emotion: Emotion.excited,
        };
    }

    getDescriptionInputs() {
        return [this.getText()];
    }
}

export function unescaped(text: string) {
    return text.replaceAll('\\\\', '\\');
}
