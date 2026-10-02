import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import {
    PATTERN_ANY_SYMBOL,
    PATTERN_DELIMITER_SYMBOL,
} from '#parser/Symbols.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Characters from '../lore/BasisCharacters';
import BasisType from '#nodes/BasisType.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import PatternClass from '#nodes/PatternClass.ts';
import PatternLiteral from '#nodes/PatternLiteral.ts';
import PatternSequence from '#nodes/PatternSequence.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import type TypeSet from '#nodes/TypeSet.ts';

/** The Pattern type, `•⣿⣿` (see LANGUAGE.md). A value of this type is a compiled
 * pattern that can be applied to text with `≈` (test) or `⌕` (search). */
export default class PatternType extends BasisType {
    readonly open: Token;
    readonly close: Token;

    constructor(open: Token, close: Token) {
        super();
        this.open = open;
        this.close = close;
        this.computeChildren();
    }

    static make() {
        return new PatternType(
            new Token(PATTERN_DELIMITER_SYMBOL, Sym.PatternDelimiter),
            new Token(PATTERN_DELIMITER_SYMBOL, Sym.PatternDelimiter),
        );
    }

    static getPossibleReplacements() {
        return [PatternType.make()];
    }

    static getPossibleInsertions() {
        return [PatternType.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternType';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'open',
                kind: node(Sym.PatternDelimiter),
                label: undefined,
            },
            {
                name: 'close',
                kind: node(Sym.PatternDelimiter),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new PatternType(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('close', this.close, replace),
            ),
        );
    }

    computeConflicts() {
        return [];
    }

    acceptsAll(types: TypeSet) {
        return types.list().every((type) => type instanceof PatternType);
    }

    getBasisTypeName(): BasisTypeName {
        return 'pattern';
    }

    getPurpose() {
        return Purpose.Patterns;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternType;
    getLocalePath() {
        return PatternType.LocalePath;
    }

    getCharacter() {
        return Characters.Pattern;
    }

    getDefaultExpression() {
        return PatternLiteral.make(
            new PatternSequence([
                new PatternClass(new Token(PATTERN_ANY_SYMBOL, Sym.PatternAny)),
            ]),
        );
    }
}
