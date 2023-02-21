import type Conflict from '@conflicts/Conflict';
import Placeholder from '@conflicts/Placeholder';
import Token from './Token';
import Type from './Type';
import PlaceholderToken from './PlaceholderToken';
import type { NativeTypeName } from '../native/NativeConstants';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import Glyphs from '../lore/Glyphs';

export default class TypePlaceholder extends Type {
    readonly placeholder: Token;

    constructor(etc?: Token) {
        super();

        this.placeholder = etc ?? new PlaceholderToken();

        this.computeChildren();
    }

    getGrammar() {
        return [
            {
                name: 'placeholder',
                types: [Token],
                label: (translation: Translation) =>
                    translation.ui.placeholders.type,
            },
        ];
    }

    computeConflicts(): Conflict[] {
        return [new Placeholder(this)];
    }

    acceptsAll(): boolean {
        return false;
    }

    getNativeTypeName(): NativeTypeName {
        return 'unknown';
    }

    clone(replace?: Replacement) {
        return new TypePlaceholder(
            this.replaceChild('placeholder', this.placeholder, replace)
        ) as this;
    }

    isPlaceholder() {
        return true;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.TypePlaceholder;
    }

    getGlyphs() {
        return Glyphs.Placeholder;
    }
}
