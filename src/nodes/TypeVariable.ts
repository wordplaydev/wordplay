import Node, { type Replacement } from './Node';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';
import Names from './Names';
import type LanguageCode from './LanguageCode';

export default class TypeVariable extends Node {
    readonly names: Names;

    constructor(names: Names) {
        super();

        this.names = names;

        this.computeChildren();
    }

    static make(names: Translations) {
        return new TypeVariable(Names.make(names));
    }

    getGrammar() {
        return [{ name: 'names', types: [Names] }];
    }

    clone(replace?: Replacement) {
        return new TypeVariable(
            this.replaceChild('names', this.names, replace)
        ) as this;
    }

    getNames() {
        return this.names.getNames();
    }
    hasName(name: string) {
        return this.names.hasName(name);
    }
    getTranslation(languages: LanguageCode[]) {
        return this.names.getTranslation(languages);
    }

    computeConflicts() {}

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'A variable type',
        };
    }
}
