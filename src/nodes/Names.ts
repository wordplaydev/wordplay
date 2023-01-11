import Node, { type Replacement } from './Node';
import type LanguageCode from '../translation/LanguageCode';
import Name from './Name';
import Token from './Token';
import { NAME_SEPARATOR_SYMBOL } from '../parser/Symbols';
import TokenType from './TokenType';
import NameToken from './NameToken';
import Language from './Language';
import type Translation from '../translation/Translation';

export default class Names extends Node {
    readonly names: Name[];

    constructor(names: Name[]) {
        super();

        // Add name separators if lacking
        this.names = names.map((name, index) =>
            index > 0 && name.separator === undefined
                ? name.withSeparator()
                : name
        );

        this.computeChildren();
    }

    static make(names: string[]) {
        const list: Name[] = [];
        if (Array.isArray(names)) {
            let first = true;
            for (const name of names) {
                list.push(
                    new Name(
                        first
                            ? undefined
                            : new Token(
                                  NAME_SEPARATOR_SYMBOL,
                                  TokenType.NAME_SEPARATOR
                              ),
                        new NameToken(name)
                    )
                );
                first = false;
            }
            return new Names(list);
        } else {
            return new Names(
                Object.keys(names).map(
                    (lang, index) =>
                        new Name(
                            index === 0
                                ? undefined
                                : new Token(
                                      NAME_SEPARATOR_SYMBOL,
                                      TokenType.NAME_SEPARATOR
                                  ),
                            new Token(
                                names[lang as LanguageCode],
                                TokenType.NAME
                            ),
                            Language.make(lang)
                        )
                )
            );
        }
    }

    getGrammar() {
        return [{ name: 'names', types: [[Name]] }];
    }

    clone(replace?: Replacement) {
        return new Names(
            this.replaceChild<Name[]>('names', this.names, replace)
        ) as this;
    }

    computeConflicts() {
        return [];
    }

    getSharedName(names: Names) {
        return this.names.find(
            (name) => name.name && names.hasName(name.name.getText())
        );
    }

    sharesName(names: Names) {
        return this.getSharedName(names) !== undefined;
    }

    getTranslation(language: string | string[]) {
        const preferredTranslation = (
            Array.isArray(language) ? language : [language]
        )
            .map((lang) =>
                this.names.find((name) => name.getLanguage() === lang)
            )
            .find((name) => name !== undefined && name.getName() !== undefined);
        return (
            preferredTranslation?.getName() ??
            (this.names.length > 0 ? this.names[0].getName() ?? '—' : '-')
        );
    }

    hasTranslation(lang: LanguageCode) {
        return (
            this.names.find((name) => name.getLanguage() === lang) !== undefined
        );
    }

    getNames() {
        return this.names
            .map((a) => a.getName())
            .filter((n): n is string => n !== undefined);
    }
    getLowerCaseNames() {
        return this.names
            .map((a) =>
                a.getName()?.toLocaleLowerCase(a.getLanguage()?.substring(0, 2))
            )
            .filter((n): n is string => n !== undefined);
    }

    hasName(name: string) {
        return this.names.find((a) => a.getName() === name) !== undefined;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Names;
    }
}
