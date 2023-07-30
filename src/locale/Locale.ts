import type LanguageCode from './LanguageCode';
import type Symbol from '../nodes/Symbol';
import type BasisTexts from './BasisTexts';
import type NodeTexts from './NodeTexts';
import type OutputTexts from './OutputTexts';
import type UITexts from './UITexts';
import type InputTexts from './InputTexts';
import type TermTexts from './TermTexts';
import { parseDoc, toTokens } from '../parser/Parser';
import type Markup from '../nodes/Markup';

/**
 * Represents a complete translation for Wordplay,
 * including every user interface label, every description, etc.
 * All of these fields must be included in order for a translation to be complete.
 **/
export type Locale = {
    /** A path to the generated JSON schema that mirrors this type, for validation and auto-complete */
    $schema: string;
    /** An ISO 639-1 language code */
    language: LanguageCode;
    /** The name of the platform */
    wordplay: string;
    term: TermTexts;
    token: Record<keyof typeof Symbol, string>;
    node: NodeTexts;
    basis: BasisTexts;
    input: InputTexts;
    output: OutputTexts;
    ui: UITexts;
};

export type Template = string;

export type NameAndDoc = {
    names: NameText;
    doc: DocText;
};

export type FunctionText<Inputs> = {
    names: NameText;
    doc: DocText;
    inputs: Inputs;
};

export type NameText = string | string[];

export type DocText = string | string[];

export function toDocString(doc: DocText) {
    return Array.isArray(doc) ? doc.join('\n\n') : doc;
}

export function docToMarkup(doc: DocText): Markup {
    const tokens = toTokens(
        '`' + (typeof doc === 'string' ? doc : doc.join('\n\n')) + '`'
    );
    return parseDoc(tokens).markup;
}

export function getFirstName(name: NameText) {
    return typeof name === 'string' ? name : name[0];
}

export default Locale;
