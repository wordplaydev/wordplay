import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { any, node, type Grammar, type Replacement } from '@nodes/Node';
import PatternAtom from '@nodes/PatternAtom';
import PatternSequence from '@nodes/PatternSequence';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/**
 * A zero-width lookaround in a pattern: `▸(…)` lookahead or `◂(…)` lookbehind.
 * Negate with `~`. See LANGUAGE.md.
 */
export default class PatternLook extends PatternAtom {
    readonly direction: Token;
    readonly open: Token;
    readonly body: PatternSequence;
    readonly close: Token | undefined;

    constructor(
        direction: Token,
        open: Token,
        body: PatternSequence,
        close: Token | undefined,
    ) {
        super();
        this.direction = direction;
        this.open = open;
        this.body = body;
        this.close = close;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternLook';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'direction',
                kind: any(node(Sym.PatternAhead), node(Sym.PatternBehind)),
                label: undefined,
            },
            { name: 'open', kind: node(Sym.EvalOpen), label: undefined },
            { name: 'body', kind: node(PatternSequence), label: undefined },
            { name: 'close', kind: node(Sym.EvalClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternLook(
            this.replaceChild('direction', this.direction, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('body', this.body, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternLook;
    getLocalePath() {
        return PatternLook.LocalePath;
    }
}
