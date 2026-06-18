import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Node, { list, node, type Grammar, type Replacement } from '@nodes/Node';
import PatternBackref from '@nodes/PatternBackref';
import PatternClass from '@nodes/PatternClass';
import PatternLiteralText from '@nodes/PatternLiteralText';
import PatternAtom from '@nodes/PatternAtom';
import PatternRange from '@nodes/PatternRange';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/**
 * A glyph set `{ … }` in a pattern, matching any one grapheme listed inside.
 * Members are literal texts, ranges, or classes. See LANGUAGE.md.
 */
export default class PatternSet extends PatternAtom {
    readonly open: Token;
    readonly members: Node[];
    readonly close: Token | undefined;

    constructor(open: Token, members: Node[], close: Token | undefined) {
        super();
        this.open = open;
        this.members = members;
        this.close = close;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternSet';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.SetOpen), label: undefined },
            {
                name: 'members',
                kind: list(
                    false,
                    node(PatternRange),
                    node(PatternClass),
                    node(PatternLiteralText),
                    node(PatternBackref),
                ),
                label: undefined,
                space: true,
            },
            { name: 'close', kind: node(Sym.SetClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternSet(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('members', this.members, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternSet;
    getLocalePath() {
        return PatternSet.LocalePath;
    }
}
