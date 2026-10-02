import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { any, node, type Grammar, type Replacement } from '#nodes/Node.ts';
import PatternAtom from '#nodes/PatternAtom.ts';
import PatternSequence from '#nodes/PatternSequence.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';

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
        return this.cloned(
            new PatternLook(
                this.replaceChild('direction', this.direction, replace),
                this.replaceChild('open', this.open, replace),
                this.replaceChild('body', this.body, replace),
                this.replaceChild('close', this.close, replace),
            ),
        );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternLook;
    getLocalePath() {
        return PatternLook.LocalePath;
    }
}
