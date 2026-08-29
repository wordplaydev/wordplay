import { Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import type { NameText } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { BasisTypeSymbols, SymbolNameRegEx } from '@parser/Symbols';
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

/** Mirrors `Name.isSymbolic()` (operator | emoji | any other Unicode symbol |
 *  basis-type delimiter) with pure parser/unicode checks. We deliberately avoid
 *  `@nodes/Name`/`Names` here: importing the nodes graph from this locale helper
 *  pulls in `Evaluate` → the values graph, forming an init-order cycle with
 *  `ExceptionValue` (a base value class whose `getDescription` calls
 *  `getConceptName`). The `SymbolNameRegEx` clause is shared with `Name` rather
 *  than restated, because omitting it here is what let `⬟` (Shape), `♪` (Note),
 *  and `▦` (Grid) pass as words — they are `So` but not `Extended_Pictographic`,
 *  so the emoji test alone misses them. */
function isSymbolicName(name: string): boolean {
    return (
        OperatorRegEx.test(name) ||
        EmojiTestRegex.test(name) ||
        SymbolNameRegEx.test(name) ||
        BasisTypeSymbols.has(name)
    );
}

/**
 * Pick a readable name from a NameText: prefer a non-symbolic name, then fall
 * back to the first (symbolic) name — never the developer-facing id, which
 * `getConceptName` only uses when there are no written names.
 *
 * Exported because anything *spoken* has the same need. A locale lists a type's
 * emoji first (`["🔳", "Group"]`), so reading `names[0]` hands a screen reader
 * the glyph — VoiceOver says "white square button" where the creator meant
 * "group". Anything building a description from a locale's `names` should come
 * through here rather than `getFirstText`.
 */
export function pickReadableName(name: NameText): string | undefined {
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
    return pickReadableName(CONCEPT_NAME[id](locale)) ?? id;
}

/** The locale entry a `@Concept` id names. `ConceptLink.isValid` asks the same
 *  question of the same four sections, so it calls this rather than repeating
 *  the walk: a link that validates but whose name can't be found here would
 *  render as its raw English id, which is the bug below. */
export function findConceptEntry(
    locale: LocaleText,
    id: string,
): object | undefined {
    for (const section of [
        locale.node,
        locale.input,
        locale.output,
        locale.basis,
    ]) {
        if (!(id in section)) continue;
        for (const [key, entry] of Object.entries(section))
            if (key === id)
                return entry !== null && typeof entry === 'object'
                    ? entry
                    : undefined;
    }
    return undefined;
}

/** Whether a value is `NameText` — one name or a list of them. */
function isNameText(value: unknown): value is NameText {
    return (
        typeof value === 'string' ||
        (Array.isArray(value) && value.every((n) => typeof n === 'string'))
    );
}

/** A locale entry's own name text. `names` before `name`, because on an output
 *  concept `name` is a *property* called "name" rather than the concept's own —
 *  the trap `CONCEPT_NAME` above is hand-written to avoid. `basis.*.name` is
 *  `NameText` and can be a list (`["⊤⊥", "Boolean"]`), so both shapes count. */
function nameTextOf(entry: object): NameText | undefined {
    if ('names' in entry && isNameText(entry.names)) return entry.names;
    if ('name' in entry && isNameText(entry.name)) return entry.name;
    return undefined;
}

/**
 * The localized name of a `@Concept` id, or undefined when this locale hasn't
 * written one — the caller's cue to try the next locale.
 *
 * This is what a concept link shows where there is no `ConceptIndex`: every page
 * outside the project, guide, tutorial, and gallery how-to. Those pages may not
 * build one, since it needs a `Project` and a `Basis` that `importGraph.test.ts`
 * forbids page-wide chrome from reaching, so the name is read from locale text
 * instead — with no nodes graph, for the reason this module already documents.
 * A `property` resolves by canonical key only; matching its localized name is
 * what `ConceptIndex` is for.
 */
export function getConceptNameById(
    locale: LocaleText,
    id: string,
    property?: string,
): string | undefined {
    const entry = findConceptEntry(locale, id);
    if (entry === undefined) return undefined;

    const name = writtenName(entry);
    if (name === undefined) return undefined;
    if (property === undefined) return name;

    for (const [key, value] of Object.entries(entry))
        if (key === property && value !== null && typeof value === 'object') {
            const propertyName = writtenName(value);
            if (propertyName !== undefined) return `${name}.${propertyName}`;
        }
    return `${name}.${property}`;
}

/** An entry's readable name, if this locale wrote one. An unwritten (`$?`) name
 *  is the English placeholder, which `Names` also filters at runtime, so it must
 *  not stop the locale chain here either. */
function writtenName(entry: object): string | undefined {
    const names = nameTextOf(entry);
    if (names === undefined) return undefined;
    const written = (Array.isArray(names) ? names : [names]).filter(
        (name) => !name.startsWith(Unwritten),
    );
    return written.length === 0 ? undefined : pickReadableName(written);
}
