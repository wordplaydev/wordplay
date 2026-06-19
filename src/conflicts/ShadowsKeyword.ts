import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type Context from '@nodes/Context';
import type Names from '@nodes/Names';
import type Node from '@nodes/Node';
import { getKeywordGlyph } from '@parser/Keywords';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';

/**
 * A low-severity advisory: a definition name is spelled like a localized keyword whose construct wins
 * over a name at expression start (e.g. naming something `none`/`true`/`function` in a locale where
 * keyword input is active). The name still works as a binding, but referring to it as a bare value or
 * call would be read as the keyword's construct instead. Minor severity so it informs without blocking
 * or flooding. See LANGUAGE.md.
 */
export default class ShadowsKeyword extends Conflict {
    readonly definition: Node;
    /** The canonical glyph of the shadowed keyword's construct, for the message. */
    readonly glyph: string;

    constructor(definition: Node, glyph: string) {
        super(ConflictSeverity.Minor);
        this.definition = definition;
        this.glyph = glyph;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.ShadowsKeyword;

    getMessage() {
        return {
            node: this.definition,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => ShadowsKeyword.LocalePath(l).explanation,
                    { keyword: this.glyph },
                ),
        };
    }

    getResolutions(context: Context, concepts: Node[]): Resolutions {
        // No auto-fix — it's advisory; the name works. Offer a navigate-to explainer.
        return Conflict.fallbackExplainer(this, context, concepts);
    }

    getLocalePath() {
        return ShadowsKeyword.LocalePath;
    }
}

/** Advisories for each of a definition's names that shadows an expression-start keyword. */
export function getKeywordShadowConflicts(
    definition: Node,
    names: Names,
): ShadowsKeyword[] {
    const conflicts: ShadowsKeyword[] = [];
    for (const name of names.names) {
        const sym = name.getShadowedKeyword();
        if (sym === undefined) continue;
        const glyph = getKeywordGlyph(sym);
        if (glyph !== undefined)
            conflicts.push(new ShadowsKeyword(definition, glyph));
    }
    return conflicts;
}
