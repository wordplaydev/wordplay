import { Sym, type SymType } from '@nodes/Sym';
import Token from '@nodes/Token';
import type Node from '@nodes/Node';

/**
 * Symbols whose presence in an unparsable fragment is a strong signal of intent.
 * If the unparsable (or its adjacent line tokens) contains one of these, a smart
 * suggestion algorithm should bias hard toward templates that *also* contain that
 * symbol. Symbols absent from this set (e.g. parentheses, dots) appear in too many
 * constructs to be useful as an intent anchor.
 */
export const DistinctiveSymbols: ReadonlySet<SymType> = new Set([
    Sym.Type,
    Sym.Function,
    Sym.Conditional,
    Sym.Convert,
    Sym.Bind,
    Sym.Share,
    Sym.Borrow,
    Sym.Change,
    Sym.Initial,
    Sym.Previous,
    Sym.Stream,
    Sym.Otherwise,
    Sym.Match,
    Sym.Select,
    Sym.Insert,
    Sym.Update,
    Sym.Delete,
    Sym.TableOpen,
    Sym.TableClose,
    Sym.TypeOpen,
    Sym.TypeClose,
    Sym.Formatted,
]);

/**
 * Token *text* novices commonly write instead of Wordplay's canonical symbols.
 * Mapping these to a SymType lets the matching algorithm recognize the intent.
 * Suggestions write the canonical symbol back, not the novice text.
 *
 * Deliberately excludes ambiguous tokens: `=` is Wordplay's equality operator
 * (so it can't safely be remapped to Bind), and bare `type` / `class` / `struct`
 * are common variable names whose mention shouldn't be over-interpreted as
 * structure-definition intent.
 */
export const MisconceptionSubstitutions: ReadonlyMap<string, SymType> = new Map(
    [
        ['fn', Sym.Function],
        ['def', Sym.Function],
        ['function', Sym.Function],
        ['if', Sym.Conditional],
        ['->', Sym.Convert],
        ['=>', Sym.Convert],
    ],
);

/**
 * Collect the set of "intent anchor" SymTypes present in a sequence of tokens.
 * Combines distinctive native symbols with misconception-substitution matches.
 */
export function collectAnchors(...tokenLists: Token[][]): Set<SymType> {
    const anchors = new Set<SymType>();
    for (const tokens of tokenLists) {
        for (const t of tokens) {
            for (const sym of t.types) {
                if (DistinctiveSymbols.has(sym)) anchors.add(sym);
            }
            const sub = MisconceptionSubstitutions.get(t.getText());
            if (sub) anchors.add(sub);
        }
    }
    return anchors;
}

/**
 * True if `template` contains at least one of the given anchor symbols in its
 * required tokens. Used to filter the template list down to candidates whose
 * structure could plausibly explain the broken fragment.
 */
export function templateContainsAnchor(
    template: Node,
    anchors: ReadonlySet<SymType>,
): boolean {
    if (anchors.size === 0) return false;
    for (const leaf of template.leaves()) {
        if (leaf instanceof Token) {
            for (const sym of leaf.types) {
                if (anchors.has(sym)) return true;
            }
        }
    }
    return false;
}
