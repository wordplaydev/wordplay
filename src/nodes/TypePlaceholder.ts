import type Conflict from '@conflicts/Conflict';
import Placeholder from '@conflicts/Placeholder';
import type Token from './Token';
import Type from './Type';
import PlaceholderToken from './PlaceholderToken';
import type { BasisTypeName } from '../basis/BasisConstants';
import { node, type Grammar, type Replacement } from './Node';
import Glyphs from '../lore/Glyphs';
import Sym from './Sym';
import type Locales from '../locale/Locales';

export default class TypePlaceholder extends Type {
    readonly placeholder: Token;

    constructor(placeholder?: Token) {
        super();

        this.placeholder = placeholder ?? new PlaceholderToken();

        this.computeChildren();
    }

    static make() {
        return new TypePlaceholder(new PlaceholderToken());
    }

    static getPossibleNodes() {
        return [TypePlaceholder.make()];
    }

    getDescriptor() {
        return 'TypePlaceholder';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'placeholder',
                kind: node(Sym.Placeholder),
                label: (locales: Locales) => locales.get((l) => l.term.type),
            },
        ];
    }

    clone(replace?: Replacement) {
        return new TypePlaceholder(
            this.replaceChild('placeholder', this.placeholder, replace)
        ) as this;
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.TypePlaceholder);
    }

    getGlyphs() {
        return Glyphs.Placeholder;
    }
}
