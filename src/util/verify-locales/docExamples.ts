import Example from '@nodes/Example';
import {
    DEFECT_SYMBOL,
    DOCS_SYMBOL,
    HIGHLIGHT_SYMBOL,
} from '@parser/Symbols';
import parseDoc from '@parser/parseDoc';
import { Sym } from '@nodes/Sym';
import { toTokens } from '@parser/toTokens';

/**
 * A serialized example whose code isn't an analyzable Wordplay program — a parser artifact from a
 * meta-example (a doc that demonstrates doc/example syntax) or a foreign-language external example.
 * These appear when a translation perturbs delimiter/annotation layout (e.g. a `⭐` highlight that
 * lands in a code fragment, or `py | a = 5` with a stray space so it's no longer an ExternalExample),
 * and analyzing them produces spurious conflicts. Real programs never start with an annotation symbol
 * or a `xx|` language tag, so skipping these is safe.
 */
function isNonProgram(code: string): boolean {
    const trimmed = code.trim();
    return (
        trimmed.startsWith(HIGHLIGHT_SYMBOL) ||
        trimmed.startsWith(DEFECT_SYMBOL) ||
        /^[a-z]{2,3}\s*\|/.test(trimmed) ||
        // A `¶…¶` doc block inside the "code" means this is a meta-example demonstrating doc/markup
        // syntax, not a program; analyzing it tokenizes the doc's prose as references (spurious
        // UnknownName). Real programs don't contain the doc delimiter.
        trimmed.includes(DOCS_SYMBOL)
    );
}

export type DocExample = {
    /** The example's program source, with original spacing preserved (significant in Wordplay: `ƒ sum(…)` ≠ `ƒsum(…)`). */
    code: string;
    /** The full example including its `\…\` delimiters and any annotations, for locating it in the raw source. */
    text: string;
    /** Whether the example is annotated with 🪲 (expected to have conflicts). */
    expectsDefect: boolean;
    /**
     * Whether the example stands on its own lines rather than sitting inside a
     * sentence — an opening `\` with nothing after it but a line break.
     *
     * The two are the same node but not the same intent. A block example is a
     * program a reader can run; an inline one is usually a *quotation* of a
     * token from the program above it, like "the \→ ''\ turns it into text",
     * which is prose rather than something that could ever evaluate alone.
     */
    block: boolean;
    /**
     * How many tokens the example's program holds.
     *
     * One token can't be a program anyone would run — it's a fragment being
     * formatted as code, like naming `\tempo\` mid-sentence — so the verifier
     * doesn't analyze it. Anything longer is plausibly an expression and is
     * still checked.
     */
    tokens: number;
};

/**
 * Parse a markup doc string and return its inline code examples. We let the parser identify example
 * boundaries (so nested `\…\` references inside formatted templates and foreign-language
 * `ExternalExample` blocks are handled correctly), then serialize each with the original `Spaces`
 * so conflict analysis sees the author's exact code rather than canonical-spacing `toWordplay()`.
 * Shared by the locale verifier and the defect-annotation codemod so they agree on every example.
 */
export default function getDocExamples(doc: string): DocExample[] {
    const tokens = toTokens(DOCS_SYMBOL + doc + DOCS_SYMBOL);
    const spaces = tokens.getSpaces();
    const all = parseDoc(tokens)
        .nodes()
        .filter((node): node is Example => node instanceof Example);
    // Exclude examples nested inside another example's program (e.g. a `\count\` reference inside a
    // `Phrase(`…`)` template): they're analyzed as part of their enclosing example, where their
    // references resolve, not standalone where they'd spuriously conflict.
    return all
        .filter(
            (example) =>
                !all.some(
                    (other) =>
                        other !== example &&
                        other.program.nodes().includes(example),
                ),
        )
        .map((example) => {
            const text = example.toWordplay(spaces);
            return {
                code: example.program.toWordplay(spaces),
                text,
                expectsDefect: example.expectsDefect(),
                // The opening delimiter alone on its line is what makes it a
                // block; anything else on that line means it's mid-sentence.
                // The leading `\s*` is the token's own preceding whitespace,
                // which `toWordplay(spaces)` includes.
                block: /^\s*\\[^\S\n]*\n/.test(text),
                // Program carries an optional End token; counting it would make
                // every span read one token longer than it looks.
                tokens: example.program
                    .leaves()
                    .filter((token) => !token.isSymbol(Sym.End)).length,
            };
        })
        .filter((example) => !isNonProgram(example.code));
}
