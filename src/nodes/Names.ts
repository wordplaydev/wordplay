import Node, { type Replacement } from './Node';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';
import type LanguageCode from './LanguageCode';
import Name from './Name';
import DuplicateLanguages from '../conflicts/DuplicateLanguages';
import DuplicateNames from '../conflicts/DuplicateNames';
import Token from './Token';
import { NAME_SEPARATOR_SYMBOL } from '../parser/Tokenizer';
import TokenType from './TokenType';
import NameToken from './NameToken';
import Language from './Language';

export default class Names extends Node {
    readonly names: Name[];

    constructor(names: Name[]) {
        super();

        this.names = names;

        this.computeChildren();
    }

    static make(names: string[] | Translations) {
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
        // Names must be unique.
        const duplicates = this.names.filter((name1) =>
            this.names.some(
                (name2) =>
                    name1 !== name2 && name1.getName() === name2.getName()
            )
        );
        if (duplicates.length > 0) return [new DuplicateNames(duplicates)];

        // Names must have unique language tags.
        const duplicateLanguages = this.names
            .filter(
                (name1) =>
                    this.names.find(
                        (name2) =>
                            name1 !== name2 &&
                            name1.getLanguage() === name2.getLanguage()
                    ) !== undefined
            )
            .map((name) => name.lang)
            .filter((lang): lang is Language => lang !== undefined);
        if (duplicateLanguages.length > 0)
            return [new DuplicateLanguages(this, duplicateLanguages)];

        return [];
    }

    sharesName(names: Names) {
        return (
            this.names.find(
                (name) => name.name && names.hasName(name.name.getText())
            ) !== undefined
        );
    }

    getTranslations() {
        const translations: Record<string, string | undefined> = {};
        for (const name of this.names) {
            translations[name.getLanguage() ?? ''] = name.getName();
        }
        return translations as Translations;
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

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'names',
        };
    }
}
