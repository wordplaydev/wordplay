import TextType from './TextType';
import type Type from './Type';
import TextValue from '@values/TextValue';
import type Language from './Language';
import type Bind from './Bind';
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
import Symbol from './Symbol';
import type Expression from './Expression';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import type Evaluator from '@runtime/Evaluator';
import type Value from '../values/Value';

export default class TextLiteral extends Literal {
    /** The raw token in the program */
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
        context: Context
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

    getGrammar(): Grammar {
        return [{ name: 'texts', kind: list(node(Translation)) }];
    }

    clone(replace?: Replacement): this {
        return new TextLiteral(
            this.replaceChild('texts', this.texts, replace)
        ) as this;
    }

    getAffiliatedType(): BasisTypeName {
        return 'text';
    }

    getDependencies(): Expression[] {
        return this.texts.map((text) => text.getExpressions()).flat();
    }

    compile(context: Context): Step[] {
        const text = this.getLocaleText(context.project.locales);
        // Choose a locale, compile its expressions, and then construct a string from the results.
        return [
            new Start(this),
            ...text
                .getExpressions()
                .reduce(
                    (parts: Step[], part) => [
                        ...parts,
                        ...part.expression.compile(context),
                    ],
                    []
                ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const translation = this.getLocaleText(evaluator.project.locales);
        const expressions = translation.segments;

        // Build the string in reverse, accounting for the reversed stack of values.
        let text = '';
        for (let i = expressions.length - 1; i >= 0; i--) {
            const p = expressions[i];
            let next: string;
            if (p instanceof Token) {
                next = unescaped(p.getText());
            } else {
                const value = evaluator.peekValue();
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
            translation.language?.getLanguageText()
        );
    }

    computeConflicts() {}

    computeType(context: Context): Type {
        // A union of all of the literal types of each alternative.
        return UnionType.getPossibleUnion(
            context,
            this.texts.map((text) =>
                text.segments.length === 1 &&
                text.segments[0] instanceof Token &&
                text.segments[0].isSymbol(Symbol.Words)
                    ? new TextType(
                          text.open.clone(),
                          text.segments[0].clone(),
                          text.close?.clone(),
                          text.language
                      )
                    : TextType.make()
            )
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

    getValue(locales: Locale[]): TextValue {
        // Get the alternatives
        const best = this.getLocaleText(locales);
        return new TextValue(
            this,
            best.getText(),
            best.language === undefined
                ? undefined
                : best.language.getLanguageText()
        );
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        bind;
        original;
        context;
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

    getNodeLocale(translation: Locale) {
        return translation.node.TextLiteral;
    }

    getStartExplanations(translation: Locale) {
        return concretize(translation, translation.node.TextLiteral.start);
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
