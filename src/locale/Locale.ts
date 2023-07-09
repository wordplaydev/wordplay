import type LanguageCode from './LanguageCode';
import type TokenType from '../nodes/TokenType';
import type NativeTexts from './NativeTexts';
import type NodeTexts from './NodeTexts';
import type OutputTexts from './OutputTexts';
import type UITexts from './UITexts';
import type ConflictTexts from './ConflictTexts';
import type InputTexts from './InputTexts';
import type ExceptionTexts from './ExceptionTexts';
import type EvaluationTexts from './EvaluationTexts';
import type TermTexts from './TermTexts';

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
    /** The placeholder string indicating that a locale string is not yet written */
    tbd: string;
    term: TermTexts;
    evaluate: EvaluationTexts;
    token: Record<keyof typeof TokenType, string>;
    node: NodeTexts;
    native: NativeTexts;
    exception: ExceptionTexts;
    conflict: ConflictTexts;
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

export function getFirstName(name: NameText) {
    return typeof name === 'string' ? name : name[0];
}

export default Locale;
