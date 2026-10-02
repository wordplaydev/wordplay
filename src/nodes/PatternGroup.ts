import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import PatternAtom from '#nodes/PatternAtom.ts';
import PatternSequence from '#nodes/PatternSequence.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';

/**
 * A grouping `( … )` in a pattern. Grouping only — it never captures (use
 * `name:` for capture). See LANGUAGE.md.
 */
export default class PatternGroup extends PatternAtom {
    readonly open: Token;
    readonly body: PatternSequence;
    readonly close: Token | undefined;

    constructor(open: Token, body: PatternSequence, close: Token | undefined) {
        super();
        this.open = open;
        this.body = body;
        this.close = close;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternGroup';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.EvalOpen), label: undefined },
            { name: 'body', kind: node(PatternSequence), label: undefined },
            { name: 'close', kind: node(Sym.EvalClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new PatternGroup(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('body', this.body, replace),
                this.replaceChild('close', this.close, replace),
            ),
        );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternGroup;
    getLocalePath() {
        return PatternGroup.LocalePath;
    }
}
