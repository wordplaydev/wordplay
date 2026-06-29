import type LocaleText from '@locale/LocaleText';
import type { NameText } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { BasisTypeSymbols } from '@parser/Symbols';
import { OperatorRegEx } from '@parser/Tokenizer';
import { EmojiTestRegex } from '@unicode/emoji';

/**
 * Maps a former `term` id to the localized name of the documented concept it
 * referred to. Each closure uses literal property access so it stays type-safe
 * (no `as`), and uses the correct field per section — `name` for basis/node,
 * `names` for output/input — avoiding the `name` (a concept's name *property*)
 * vs `names` (the concept's own name) trap on output concepts.
 *
 * `satisfies` keeps the literal key types so `ConceptTermId` is the exact union
 * of valid ids — passing any other string is a compile error.
 */
const CONCEPT_NAME = {
    boolean: (l: LocaleText) => l.basis.Boolean.name,
    none: (l: LocaleText) => l.basis.None.name,
    text: (l: LocaleText) => l.basis.Text.name,
    number: (l: LocaleText) => l.basis.Number.name,
    list: (l: LocaleText) => l.basis.List.name,
    set: (l: LocaleText) => l.basis.Set.name,
    map: (l: LocaleText) => l.basis.Map.name,
    table: (l: LocaleText) => l.basis.Table.name,
    structure: (l: LocaleText) => l.basis.Structure.name,
    output: (l: LocaleText) => l.output.Output.names,
    phrase: (l: LocaleText) => l.output.Phrase.names,
    group: (l: LocaleText) => l.output.Group.names,
    stage: (l: LocaleText) => l.output.Stage.names,
    row: (l: LocaleText) => l.output.Row.names,
    source: (l: LocaleText) => l.output.Source.names,
    scene: (l: LocaleText) => l.input.Scene.names,
    function: (l: LocaleText) => l.node.FunctionDefinition.name,
    stream: (l: LocaleText) => l.node.StreamDefinition.name,
    exception: (l: LocaleText) => l.node.ExceptionType.name,
    pattern: (l: LocaleText) => l.node.PatternLiteral.name,
    input: (l: LocaleText) => l.node.Input.name,
} satisfies Record<string, (l: LocaleText) => NameText>;

/** The set of valid concept-term ids; an invalid id is a compile error. */
export type ConceptTermId = keyof typeof CONCEPT_NAME;

/** Mirrors `Name.isSymbolic()` (operator | emoji | basis-type delimiter) with
 *  pure parser/unicode checks. We deliberately avoid `@nodes/Name`/`Names` here:
 *  importing the nodes graph from this locale helper pulls in `Evaluate` → the
 *  values graph, forming an init-order cycle with `ExceptionValue` (a base value
 *  class whose `getDescription` calls `getConceptName`). */
function isSymbolicName(name: string): boolean {
    return (
        OperatorRegEx.test(name) ||
        EmojiTestRegex.test(name) ||
        BasisTypeSymbols.has(name)
    );
}

/** Pick a readable name from a NameText: prefer a non-symbolic name, then fall
 *  back to the first (symbolic) name — never the developer-facing id, which
 *  `getConceptName` only uses when there are no written names. */
function pickConceptName(name: NameText): string | undefined {
    const names = (Array.isArray(name) ? name : [name])
        .map((n) => withoutAnnotations(n))
        .filter((n) => n !== '');
    return names.find((n) => !isSymbolicName(n)) ?? names[0];
}

/**
 * The localized display name of the concept a former `term` id referred to,
 * used for labeling nodes, values, and output now that the glossary no longer
 * duplicates concept-named terms.
 */
export default function getConceptName(
    locale: LocaleText,
    id: ConceptTermId,
): string {
    return pickConceptName(CONCEPT_NAME[id](locale)) ?? id;
}
