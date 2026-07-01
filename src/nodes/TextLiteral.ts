import { Purpose } from '@concepts/Purpose';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
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
import type { BasisTypeName } from '@basis/BasisConstants';
import type Locales from '@locale/Locales';
import { Emotion } from '../lore/Emotion';
import { getCodepointFromString } from '@unicode/getCodepoint';
import type Value from '@values/Value';
import type Context from '@nodes/Context';
import ConceptLink from '@nodes/ConceptLink';
import Example from '@nodes/Example';
import type Expression from '@nodes/Expression';
import FormattedLiteral from '@nodes/FormattedLiteral';
import type Language from '@nodes/Language';
import Node from '@nodes/Node';
import { getPreferred } from '@nodes/LanguageTagged';
import Literal from '@nodes/Literal';
import { list, node, type Grammar, type Replacement } from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import TextType from '@nodes/TextType';
import Token from '@nodes/Token';
import Words from '@nodes/Words';
import Translation from '@nodes/Translation';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import UnionType from '@nodes/UnionType';

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

    static getPossibleText(type: Type | undefined, context: Context) {
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

    static getPossibleReplacements({ type, node, context }: ReplaceContext) {
        // Offer "convert to plain text" when replacing a FormattedLiteral —
        // strips formatting (bold, italic, links, etc.) but preserves any
        // \…\ Example template segments and the language tag of each
        // translation.
        if (node instanceof FormattedLiteral) {
            // Walk a Markup tree, returning interleaved text/Example chunks
            // in document order. Words wrappers are unwrapped (their open/
            // close formatting tokens dropped); Examples are preserved
            // verbatim; any other Node's leaf Tokens contribute to the text
            // stream.
            type Chunk =
                | { kind: 'text'; value: string }
                | { kind: 'example'; value: Example };
            const collect = (n: Node): Chunk[] => {
                if (n instanceof Example)
                    return [{ kind: 'example', value: n }];
                if (n instanceof Words)
                    return n.segments.flatMap((s) =>
                        s instanceof Node ? collect(s) : [],
                    );
                if (n instanceof Token)
                    return [{ kind: 'text', value: n.getText() }];
                return n
                    .getChildren()
                    .flatMap((c) => (c instanceof Node ? collect(c) : []));
            };

            return [
                new TextLiteral(
                    node.texts.map((t) => {
                        const chunks: Chunk[] = [];
                        t.markup.paragraphs.forEach((p, i) => {
                            if (i > 0)
                                chunks.push({ kind: 'text', value: '\n\n' });
                            chunks.push(...collect(p));
                        });

                        // Merge adjacent text chunks into Sym.Words tokens,
                        // keep Examples in place.
                        const segments: (Token | Example)[] = [];
                        let textBuffer = '';
                        const flush = () => {
                            if (textBuffer.length > 0) {
                                segments.push(new Token(textBuffer, Sym.Words));
                                textBuffer = '';
                            }
                        };
                        for (const c of chunks) {
                            if (c.kind === 'text') textBuffer += c.value;
                            else {
                                flush();
                                segments.push(c.value);
                            }
                        }
                        flush();

                        return new Translation(
                            new Token("'", Sym.Text),
                            segments,
                            new Token("'", Sym.Text),
                            t.language,
                            undefined,
                        );
                    }),
                ),
            ];
        }
        return this.getPossibleText(type, context);
    }

    static getPossibleInsertions({ type, context }: InsertContext) {
        return this.getPossibleText(type, context);
    }

    getDescriptor(): NodeDescriptor {
        return 'TextLiteral';
    }

    getPurpose() {
        return Purpose.Text;
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'texts',
                kind: list(false, node(Translation)),
                label: () => (l) => l.node.TextLiteral.label.texts,
            },
        ];
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
            } else if (segment instanceof ConceptLink) {
                // A character/codepoint reference (#773). Resolve a codepoint to
                // its actual character; keep a custom-character reference (e.g.
                // @amy/cat) as literal text for the view to render.
                next = segment.getCodepoint() ?? segment.concept.getText();
            } else {
                const value = evaluator.popValue(this);
                if (value instanceof TextValue) next = value.text;
                else {
                    // Localize an interpolated number for output (#1196), using
                    // this text's own locale when tagged, else the active output
                    // locale. Only numbers localize; other types fall back to
                    // their round-trippable string via Value.toText.
                    const target =
                        translation.language?.getLocaleID() ??
                        evaluator.getLocaleIDs()[0];
                    next = target ? value.toText(target) : value.toString();
                }
            }
            // Assemble in reverse order
            text = next + text;
        }

        // Construct the text value, carrying the translation's locale node.
        return new TextValue(this, text, translation.language);
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
        return new TextValue(this, best.getText(), best.language);
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
            symbols: this.texts[0].getDelimiters() ?? '–',
            emotion: Emotion.excited,
        };
    }

    getDescriptionInputs() {
        return {
            text: this.getText(),
        };
    }
}

const ConceptRegEx = new RegExp(ConceptRegExPattern, 'ug');
const ConceptAtStart = new RegExp(`^${ConceptRegExPattern}`, 'u');

/**
 * Resolve `@<codepoint>` references (e.g. `@2713` → ✓) to their characters,
 * leaving any other `@`-link (`@name`, `@example.com`) as literal text. Shared
 * by text-literal and markup unescaping, since both render codepoint escapes.
 */
export function resolveCodepoints(text: string): string {
    return text.replace(
        ConceptRegEx,
        (ref) => getCodepointFromString(ref.substring(1)) ?? ref,
    );
}

/**
 * Unescape a text-literal token, scanning left to right so adjacent escapes
 * don't interfere: `\\`→`\`, `@@`→`@`, and `@<codepoint>`→its character. Because
 * `@@` is consumed first, `@@2713` is a literal `@` followed by `2713`, not the
 * codepoint U+2713. (Markup literals use the doubling scheme for every markup
 * symbol via `unescapeMarkupSymbols`; this is the narrower text-literal scheme.)
 */
export function unescaped(text: string): string {
    let result = '';
    let index = 0;
    while (index < text.length) {
        if (text.startsWith('\\\\', index)) {
            result += '\\';
            index += 2;
        } else if (text.startsWith('@@', index)) {
            result += '@';
            index += 2;
        } else if (text[index] === '@') {
            const match = ConceptAtStart.exec(text.substring(index));
            const codepoint = match
                ? getCodepointFromString(match[0].substring(1))
                : undefined;
            if (match !== null && codepoint !== undefined) {
                result += codepoint;
                index += match[0].length;
            } else {
                result += text[index];
                index += 1;
            }
        } else {
            result += text[index];
            index += 1;
        }
    }
    return result;
}
