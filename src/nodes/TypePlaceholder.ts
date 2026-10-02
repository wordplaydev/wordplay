import { Purpose } from '#concepts/Purpose.ts';
import type Conflict from '#conflicts/Conflict.ts';
import Placeholder from '#conflicts/Placeholder.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import PlaceholderToken from '#nodes/PlaceholderToken.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';
import Type from '#nodes/Type.ts';

export default class TypePlaceholder extends Type {
    readonly placeholder: Token;

    constructor(placeholder?: Token) {
        super();

        this.placeholder = placeholder ?? PlaceholderToken();

        this.computeChildren();
    }

    static make() {
        return new TypePlaceholder(PlaceholderToken());
    }

    static getPossibleReplacements() {
        return [TypePlaceholder.make()];
    }

    static getPossibleInsertions() {
        return [TypePlaceholder.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'TypePlaceholder';
    }

    getPurpose() {
        return Purpose.Advanced;
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'placeholder',
                kind: node(Sym.Placeholder),
                label: () => (l) => l.glossary.type.word,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new TypePlaceholder(
                this.replaceChild('placeholder', this.placeholder, replace),
            ),
        );
    }

    computeConflicts(): Conflict[] {
        return [new Placeholder(this)];
    }

    acceptsAll(): boolean {
        return false;
    }

    getBasisTypeName(): BasisTypeName {
        return 'unknown';
    }

    isPlaceholder() {
        return true;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.TypePlaceholder;
    getLocalePath() {
        return TypePlaceholder.LocalePath;
    }

    getCharacter() {
        return Characters.Placeholder;
    }
}
