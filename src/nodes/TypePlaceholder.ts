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

    constructor(placeholder?: Token) {
        super();

        this.placeholder = placeholder ?? new PlaceholderToken();

        this.computeChildren();
    }

    static make() {
        return new TypePlaceholder(new PlaceholderToken());
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

    getNativeTypeName(): NativeTypeName {
        return 'unknown';
    }

    isPlaceholder() {
        return true;
    }

    getNodeTranslation(translation: Translation) {
        return translation.node.TypePlaceholder;
    }

    getGlyphs() {
        return Glyphs.Placeholder;
    }
}
