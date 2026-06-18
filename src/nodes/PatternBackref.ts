import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import PatternAtom from '@nodes/PatternAtom';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/**
 * A backreference in a pattern — a bare capture name that matches the same text
 * the named capture matched, e.g., the second `w` in `⣿w: ▭/en >0 ␣ w⣿`.
 * See LANGUAGE.md–§4.
 */
export default class PatternBackref extends PatternAtom {
    readonly name: Token;

    constructor(name: Token) {
        super();
        this.name = name;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternBackref';
    }

    getGrammar(): Grammar {
        return [{ name: 'name', kind: node(Sym.Name), label: undefined }];
    }

    clone(replace?: Replacement) {
        return new PatternBackref(
            this.replaceChild('name', this.name, replace),
        ) as this;
    }

    /** An empty name is the parser's placeholder for a missing atom (see
     *  parsePatternAtom). Treating it as a placeholder lets the editor render a
     *  fillable slot and surface the atom menu, rather than an empty token that
     *  reads as a (spurious) undefined backreference. */
    isPlaceholder() {
        return this.name.getText().length === 0;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternBackref;
    getLocalePath() {
        return PatternBackref.LocalePath;
    }
}
