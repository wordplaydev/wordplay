import type { TemplateInput } from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import PatternNode from '#nodes/PatternNode.ts';
import PatternAtom from '#nodes/PatternAtom.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';

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
        return this.cloned(
            new PatternCapture(
                this.replaceChild('name', this.name, replace),
                this.replaceChild('bind', this.bind, replace),
                this.replaceChild('atom', this.atom, replace),
            ),
        );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternCapture;
    getLocalePath() {
        return PatternCapture.LocalePath;
    }

    getDescriptionInputs(): Record<string, TemplateInput> {
        return { name: this.name.getText() };
    }
}
