import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import PatternAtom from '@nodes/PatternAtom';
import PatternSequence from '@nodes/PatternSequence';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

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
        return new PatternGroup(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('body', this.body, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternGroup;
    getLocalePath() {
        return PatternGroup.LocalePath;
    }
}
