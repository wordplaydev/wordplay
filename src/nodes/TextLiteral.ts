import TextType from './TextType';
import type Type from './Type';
import Text from '@runtime/Text';
import type Language from './Language';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import { node, type Grammar, type Replacement, list } from './Node';
import type Locale from '@locale/Locale';
import Literal from './Literal';
import Emotion from '../lore/Emotion';
import type { BasisTypeName } from '../basis/BasisConstants';
import { TextDelimiters } from '../parser/Tokenizer';
import concretize from '../locale/concretize';
import type Node from './Node';
import Translation from './Translation';
import UnionType from './UnionType';
import { getPreferred } from './LanguageTagged';

export const ESCAPE_REGEX = /\\(.)/g;

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

    computeConflicts() {}

    computeType(context: Context): Type {
        return UnionType.getPossibleUnion(
            context,
            this.texts.map((text) => new TextType(text.text, text.language))
        );
    }

    /** Get the text, with any escape characters processed. */
    getText(): string {
        // Replace any escapes with the character they're escaping
        return unescaped(this.texts[0].getText());
    }

    getValue(locales: Locale[]): Text {
        // Get the alternatives
        const best =
            this.texts.length === 1
                ? this.texts[0]
                : getPreferred(locales, this.texts);

        return new Text(
            this,
            undelimited(best.getText()),
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
            symbols: this.texts[0].text.getDelimiters(),
            emotion: Emotion.excited,
        };
    }

    getDescriptionInputs() {
        return [this.getText()];
    }
}

export function unescaped(text: string) {
    return text.replaceAll(ESCAPE_REGEX, '$1');
}

export function undelimited(text: string) {
    return text.substring(
        1,
        text.length - (TextDelimiters.has(text.charAt(text.length - 1)) ? 1 : 0)
    );
}
