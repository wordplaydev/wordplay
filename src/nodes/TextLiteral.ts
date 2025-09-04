import type EditContext from '@edit/EditContext';
import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { ConceptRegExPattern } from '@parser/Tokenizer';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import TextValue from '@values/TextValue';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import Emotion from '../lore/Emotion';
import { getCodepointFromString } from '../unicode/getCodepoint';
import type Value from '../values/Value';
import type Context from './Context';
import type Expression from './Expression';
import type Language from './Language';
import { getPreferred } from './LanguageTagged';
import Literal from './Literal';
import { list, node, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import TextType from './TextType';
import Token from './Token';
import Translation from './Translation';
import type Type from './Type';
import type TypeSet from './TypeSet';
import UnionType from './UnionType';

export default class TextLiteral extends Literal {
    /** The list of translations for the text literal */
    readonly texts: Translation[];

    /** A cache of unescaped tokens by id, as they are static, and we should only compute them once. */
    readonly unescapedTokenCache: Record<string, string> = {};

    constructor(text: Translation[]) {
        super();

        this.texts = text;

        this.computeChildren();
    }

    static make(text?: string, language?: Language) {
        return new TextLiteral([Translation.make(text ?? '', language)]);
    }

    static getPossibleReplacements({ type, context }: EditContext) {
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

    static getPossibleAppends(context: EditContext) {
        return this.getPossibleReplacements(context);
    }

    getDescriptor(): NodeDescriptor {
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

    getLanguage(lang: LanguageCode) {
        return this.texts.find(
            (text) => text.language?.getLanguageCode() === lang,
        );
    }

    withOption(text: Translation) {
        return new TextLiteral([...this.texts, text]);
    }

    getOptions() {
        return this.texts;
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        const text = this.getLocaleText(evaluator.getLocaleIDs());
        // Choose a locale, compile its expressions, and then construct a string from the results.
        return [
            new Start(this),
            ...text
                .getExpressions()
                .reduce(
                    (parts: Step[], part) => [
                        ...parts,
                        ...part.compile(evaluator, context),
                    ],
                    [],
                ),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const translation = this.getLocaleText(evaluator.getLocaleIDs());
        const segments = translation.segments;

        // Build the string in reverse, accounting for the reversed stack of values.
        let text = '';
        for (let i = segments.length - 1; i >= 0; i--) {
            const segment = segments[i];
            let next: string;
            if (segment instanceof Token) {
                next = this.getUnescapedToken(segment);
            } else {
                const value = evaluator.popValue(this);
                next =
                    value instanceof TextValue
                        ? value.text
                        : (value.toString() ?? '');
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

    /** Retrieve or compute and cache the text version of the static token text. */
    private getUnescapedToken(token: Token) {
        // If we have a cached value, return it.
        const cached = this.unescapedTokenCache[token.id];
        if (cached) return cached;

        // Otherwise, compute the unescaped token and cache it.
        const text = unescaped(token.getText());
        this.unescapedTokenCache[token.id] = text;
        return text;
    }

    computeConflicts() {
        return [];
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

    getValue(locales: Locale[]): TextValue {
        // Get the alternatives
        const best = this.getLocaleText(locales);
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

    getTagged(): Translation[] {
        return this.texts;
    }

    getStart() {
        return this.texts[0];
    }

    getFinish() {
        return this.texts[0];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.TextLiteral;
    getLocalePath() {
        return TextLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.TextLiteral.start);
    }

    getCharacter() {
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
    // First, replace any \\ with the actual backslash character.
    text = text.replaceAll('\\\\', '\\');

    // Then, see if there are any Unicode escapes, and replace them with the actual character.
    for (const { concept, unicode } of getConcepts(text)) {
        if (unicode) text = text.replace(concept, unicode);
    }

    return text;
}

const ConceptRegEx = new RegExp(ConceptRegExPattern, 'ug');

function getConcepts(text: string) {
    return Array.from(text.matchAll(ConceptRegEx)).map((match) => ({
        concept: match[0],
        index: match.index,
        unicode: getCodepointFromString(match[0].substring(1)),
    }));
}
