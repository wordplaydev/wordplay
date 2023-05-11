import Node, { type Replacement } from './Node';
import type LanguageCode from '@locale/LanguageCode';
import Name from './Name';
import Token from './Token';
import { COMMA_SYMBOL } from '@parser/Symbols';
import TokenType from './TokenType';
import NameToken from './NameToken';
import Language from './Language';
import type Locale from '@locale/Locale';
import Purpose from '../concepts/Purpose';
import Emotion from '../lore/Emotion';

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
                            : new Token(COMMA_SYMBOL, TokenType.Separator),
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
                                : new Token(COMMA_SYMBOL, TokenType.Separator),
                            new Token(
                                names[lang as LanguageCode],
                                TokenType.Name
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

    getPurpose() {
        return Purpose.Represent;
    }

    computeConflicts() {
        return [];
    }

    hasLanguage() {
        return this.names.some((name) => name.hasLanguage());
    }

    getSharedName(names: Names) {
        return this.names.find(
            (name) => name.name && names.hasName(name.name.getText())
        );
    }

    sharesName(names: Names) {
        return this.getSharedName(names) !== undefined;
    }

    /** Returns a single grapheme name if there is one. */
    getEmojiName() {
        return this.names.find((name) => name.isEmoji())?.getName();
    }

    getLocaleText(
        language: LanguageCode | LanguageCode[],
        symbolic: boolean = true
    ) {
        return this.getLocaleName(language, symbolic)?.getName() ?? '-';
    }

    getLocaleName(
        language: LanguageCode | LanguageCode[],
        symbolic: boolean = true
    ) {
        // Find the name with the most preferred language code.
        const languages = Array.isArray(language) ? language : [language];
        const preferredName = this.names.find((name) => {
            const lang = name.getLanguage();
            return (
                lang !== undefined &&
                languages.includes(lang) &&
                (symbolic || !name.isEmoji())
            );
        });
        return (
            preferredName ?? (this.names.length > 0 ? this.names[0] : undefined)
        );
    }

    hasLocale(lang: LanguageCode) {
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

    getNameStartingWith(prefix: string) {
        return this.names.find((name) => name.startsWith(prefix));
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Names;
    }

    withName(name: string, language: LanguageCode) {
        const languageMatchIndex = this.names.findIndex(
            (name) => name.getLanguage() === language
        );
        const untaggedMatchIndex = this.names.findIndex(
            (name) => name.getLanguage() === undefined
        );
        const index =
            languageMatchIndex >= 0 ? languageMatchIndex : untaggedMatchIndex;

        const newName = Name.make(name, Language.make(language));
        return new Names(
            index < 0
                ? [...this.names, newName]
                : [
                      ...this.names.slice(0, index),
                      newName,
                      ...this.names.slice(index + 1),
                  ]
        );
    }

    getGlyphs() {
        return {
            symbols: this.getNames()[0],
            emotion: Emotion.Kind,
        };
    }
}
