import Node, { type Replacement } from './Node';
import Names from './Names';
import type LanguageCode from '../translation/LanguageCode';
import type Translation from '../translation/Translation';
import NameType from './NameType';

export default class TypeVariable extends Node {
    readonly names: Names;

    constructor(names: Names) {
        super();

        this.names = names;

        this.computeChildren();
    }

    getGrammar() {
        return [{ name: 'names', types: [Names] }];
    }

    clone(replace?: Replacement) {
        return new TypeVariable(
            this.replaceChild('names', this.names, replace)
        ) as this;
    }

    getReference(): NameType {
        return NameType.make(this.names.getNames()[0], this);
    }

    getNames() {
        return this.names.getNames();
    }

    hasName(name: string) {
        return this.names.hasName(name);
    }

    getTranslation(languages: LanguageCode | LanguageCode[]) {
        return this.names.getTranslation(
            Array.isArray(languages) ? languages : [languages]
        );
    }

    computeConflicts() {}

    getNodeTranslation(translation: Translation) {
        return translation.nodes.TypeVariable;
    }
}
