import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import {
    any,
    node,
    optional,
    type Grammar,
    type Replacement,
} from '#nodes/Node.ts';
import PatternAtom from '#nodes/PatternAtom.ts';
import PatternProperty from '#nodes/PatternProperty.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';

/**
 * A character-class atom in a pattern: `◌` (any grapheme), `_` (letter),
 * `#` (digit), or `␣` (space), with an optional `/property` qualifier
 * (e.g. `_/greek`, `◌/emoji`). See LANGUAGE.md.
 */
export default class PatternClass extends PatternAtom {
    readonly base: Token;
    readonly property: PatternProperty | undefined;

    constructor(base: Token, property?: PatternProperty) {
        super();
        this.base = base;
        this.property = property;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternClass';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'base',
                kind: any(
                    node(Sym.PatternAny),
                    node(Sym.PatternLetter),
                    node(Sym.PatternDigit),
                    node(Sym.PatternSpace),
                ),
                label: undefined,
            },
            {
                name: 'property',
                kind: optional(node(PatternProperty)),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new PatternClass(
                this.replaceChild('base', this.base, replace),
                this.replaceChild('property', this.property, replace),
            ),
        );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternClass;
    getLocalePath() {
        return PatternClass.LocalePath;
    }
}
