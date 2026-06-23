import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import PatternNode from '@nodes/PatternNode';
import PatternAtom from '@nodes/PatternAtom';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/**
 * A named capture in a pattern, e.g., `y:(4 #)`. Captures are named-only (no
 * numbered groups); the name is a single name token. See LANGUAGE.md.
 */
export default class PatternCapture extends PatternNode {
    readonly name: Token;
    readonly bind: Token;
    readonly atom: PatternNode;

    constructor(name: Token, bind: Token, atom: PatternNode) {
        super();
        this.name = name;
        this.bind = bind;
        this.atom = atom;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternCapture';
    }

    getGrammar(): Grammar {
        return [
            { name: 'name', kind: node(Sym.Name), label: undefined },
            { name: 'bind', kind: node(Sym.Bind), label: undefined },
            {
                name: 'atom',
                kind: node(PatternAtom),
                label: undefined,
                space: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternCapture(
            this.replaceChild('name', this.name, replace),
            this.replaceChild('bind', this.bind, replace),
            this.replaceChild('atom', this.atom, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternCapture;
    getLocalePath() {
        return PatternCapture.LocalePath;
    }
}
