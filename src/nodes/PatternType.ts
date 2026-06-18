import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { PATTERN_ANY_SYMBOL, PATTERN_DELIMITER_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '@basis/BasisConstants';
import { Purpose } from '@concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import BasisType from '@nodes/BasisType';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import PatternClass from '@nodes/PatternClass';
import PatternLiteral from '@nodes/PatternLiteral';
import PatternSequence from '@nodes/PatternSequence';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import type TypeSet from '@nodes/TypeSet';

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
            { name: 'open', kind: node(Sym.PatternDelimiter), label: undefined },
            { name: 'close', kind: node(Sym.PatternDelimiter), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
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
                new PatternClass(
                    new Token(PATTERN_ANY_SYMBOL, Sym.PatternAny),
                ),
            ]),
        );
    }
}
