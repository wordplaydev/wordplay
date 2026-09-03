import Dimension from '@nodes/Dimension';
import type Source from '@nodes/Source';
import Sym, { type SymType } from '@nodes/Sym';
import type Token from '@nodes/Token';
import {
    Scripts,
    type ScriptMetadata,
    type WritingLayout,
} from '@locale/Scripts';

/**
 * Which writing layouts a source could be set in.
 *
 * The layout of code belongs to the code, not to whoever is reading it: the
 * interface is in one or more declared languages, but a program can be written
 * in any combination of languages, including ones the interface is not in. So
 * this decides only what is *offered* — the creator always chooses (#1203).
 *
 * The signal is the glyphs actually written, not the project's locales.
 * `Project.getLocalesUsed()` looks like the right thing and is not: it misses
 * untagged text (`Phrase('こんにちは')` reports only English), and a locale is not
 * a script — Serbian is written in two alphabets.
 */

/** Every vertical layout some script is set in, and the scripts that use it. */
const VerticalScripts: { script: string; layout: WritingLayout }[] =
    Object.entries(Scripts).flatMap(([code, entry]) => {
        // Annotated because Scripts is declared with `satisfies`, so each entry
        // keeps its literal type and an optional field is absent from the ones
        // that don't set it.
        const script: ScriptMetadata = entry;
        return script.verticalLayout === undefined
            ? []
            : [{ script: code, layout: script.verticalLayout }];
    });

/** Matchers built once: a regex per vertical script, testing Script_Extensions.
 *
 *  `scx`, not `sc`, and that distinction decides whether this works at all: the
 *  katakana prolongation mark `ー` is Script=Common, so a plain
 *  `\p{Script=Katakana}` test rejects it — and `フレーズ`, a Katakana name, would
 *  report "not vertical", making Japanese permanently ineligible.
 *
 *  Codes Unicode has no script value for are skipped, which is safe rather than
 *  lossy: they are ISO 15924's *composite* codes (`Hans` and `Hant` for
 *  Simplified and Traditional Chinese, `Kore` for Korean), and Unicode has no
 *  such scripts because the text is simply Han, or Hangul and Han. Those
 *  components are in this list with the same layout, so Chinese and Korean
 *  resolve through them — which `eligibleWritingLayouts.test.ts` asserts. */
const VerticalMatchers: { match: RegExp; layout: WritingLayout }[] =
    VerticalScripts.flatMap(({ script, layout }) => {
        try {
            return [{ match: new RegExp(`\\p{scx=${script}}`, 'u'), layout }];
        } catch {
            return [];
        }
    });

const Letter = /\p{L}/u;

/** The tokens whose glyphs a reader actually reads. Deliberately not every
 *  token: `ƒ` and `ø` are Wordplay's own syntax and also Latin letters, so
 *  including operators would make every program ineligible for vertical. */
const ContentTokens: SymType[] = [Sym.Name, Sym.Words];

/** The vertical layout this letter is set in, or undefined for one that has none. */
function layoutOfLetter(letter: string): WritingLayout | undefined {
    return VerticalMatchers.find(({ match }) => match.test(letter))?.layout;
}

/**
 * Memoized on the source, which is safe because a `Source` is immutable — an
 * edit produces a new one. Both the editor and its toolbar derive this from the
 * same source on every keystroke, and the scan walks the whole AST twice (once
 * for `Dimension` leaves, once for tokens) before it can exit early, so without
 * this every keystroke paid for it twice over.
 */
const cache = new WeakMap<Source, WritingLayout[]>();

export default function eligibleWritingLayouts(
    source: Source,
): WritingLayout[] {
    const remembered = cache.get(source);
    if (remembered !== undefined) return remembered;
    const computed = scan(source);
    cache.set(source, computed);
    return computed;
}

function scan(source: Source): WritingLayout[] {
    const horizontal: WritingLayout = 'horizontal-tb';

    // A unit's name lexes as an ordinary name (`1.5m` gives a Name token `m`),
    // so without this every program that measures anything would be ineligible.
    // A unit is notation rather than prose, and vertical CJK rotates embedded
    // Latin by design, so it says nothing about how the code should be laid out.
    const units = new Set<Token>();
    for (const node of source.expression.nodes())
        if (node instanceof Dimension)
            for (const leaf of node.leaves()) units.add(leaf);

    let vertical: WritingLayout | undefined = undefined;
    for (const token of source.expression.leaves()) {
        if (units.has(token)) continue;
        if (!token.types.some((type) => ContentTokens.includes(type))) continue;
        for (const character of token.getText()) {
            if (!Letter.test(character)) continue;
            const layout = layoutOfLetter(character);
            // A letter with no vertical tradition, or two vertical scripts that
            // disagree: the layouts they share is horizontal alone. This is why
            // mixed Latin and Japanese reads horizontally — Latin has one mode,
            // Japanese has both.
            if (
                layout === undefined ||
                (vertical !== undefined && layout !== vertical)
            )
                return [horizontal];
            vertical = layout;
        }
    }

    return vertical === undefined ? [horizontal] : [horizontal, vertical];
}
