import type Conflict from '../conflicts/Conflict';
import Placeholder from '../conflicts/Placeholder';
import Token from './Token';
import Type from './Type';
import type Node from './Node';
import PlaceholderToken from './PlaceholderToken';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';
import type { NativeTypeName } from '../native/NativeConstants';

export default class TypePlaceholder extends Type {
    readonly placeholder: Token;

    constructor(etc?: Token) {
        super();

        this.placeholder = etc ?? new PlaceholderToken();

        this.computeChildren();
    }

    getGrammar() {
        return [{ name: 'placeholder', types: [Token] }];
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

    clone(original?: Node, replacement?: Node) {
        return new TypePlaceholder(
            this.replaceChild(
                'placeholder',
                this.placeholder,
                original,
                replacement
            )
        ) as this;
    }

    isPlaceholder() {
        return true;
    }

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if (child === this.placeholder)
            return {
                '😀': TRANSLATE,
                eng: 'type',
            };
    }

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'A type placeholder',
        };
    }
}
