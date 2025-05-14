import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { COMMA_SYMBOL } from '@parser/Symbols';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Emotion from '../lore/Emotion';
import Language from './Language';
import { getPreferred as getPreferredName } from './LanguageTagged';
import Name from './Name';
import NameToken from './NameToken';
import type { Grammar, Replacement } from './Node';
import Node, { list, node } from './Node';
import Sym from './Sym';
import Token from './Token';

export default class Names extends Node {
    readonly names: Name[];

    constructor(names: Name[]) {
        super();

        // Add name separators if lacking
        this.names = names.map((name, index) =>
            index < names.length - 1 && name.separator === undefined
                ? name.withSeparator()
                : name,
        );

        this.computeChildren();
    }

    static make(names: string[] = []) {
        const list: Name[] = [];
        let count = 0;
        for (const name of names) {
            count++;
            list.push(
                new Name(
                    new NameToken(name),
                    undefined,
                    count === names.length
                        ? undefined
                        : new Token(COMMA_SYMBOL, Sym.Separator),
                ),
            );
        }
        return new Names(list);
    }

    getDescriptor(): NodeDescriptor {
        return 'Names';
    }

    getGrammar(): Grammar {
        return [{ name: 'names', kind: list(false, node(Name)) }];
    }

    clone(replace?: Replacement) {
        return new Names(
            this.replaceChild<Name[]>('names', this.names, replace),
        ) as this;
    }

    simplify() {
        return new Names(this.names.map((name) => name.simplify()));
    }

    getPurpose() {
        return Purpose.Bind;
    }

    computeConflicts() {
        return [];
    }

    getTagged(): Name[] {
        return this.names;
    }

    getLanguages() {
        return this.names
            .map((name) => name.getLanguage())
            .filter((lang): lang is LanguageCode => lang !== undefined);
    }

    hasALanguageTag() {
        return this.names.some((name) => name.hasLanguage());
    }

    getLocaleOf(name: string) {
        return this.names
            .find((n) => n.getName() === name)
            ?.language?.getLocaleID();
    }

    containsLanguage(lang: LanguageCode) {
        return this.names.some((name) => name.getLanguage() === lang);
    }

    getSharedName(names: Names) {
        return this.names.find(
            (name) => name.name && names.hasName(name.name.getText()),
        );
    }

    sharesName(names: Names) {
        return this.getSharedName(names) !== undefined;
    }

    /** Returns a single grapheme name if there is one. */
    getSymbolicName() {
        return this.names.find((name) => name.isSymbolic())?.getName();
    }

    getNonSymbolicName() {
        return this.names.find((name) => !name.isSymbolic())?.getName();
    }

    hasSymbolicName() {
        return this.getSymbolicName() !== undefined;
    }

    getPreferredNameString(
        preferred: LocaleText | LocaleText[] | Locale | Locale[],
        symbolic = true,
    ) {
        preferred = Array.isArray(preferred) ? preferred : [preferred];
        return (
            this.getPreferredName(preferred, symbolic)?.getName() ??
            this.names[0]?.getName() ??
            '-'
        );
    }

    getPreferredName(
        preferred: LocaleText | LocaleText[] | Locale | Locale[],
        symbolic = true,
    ): Name | undefined {
        if (symbolic) {
            const symbolicMatch = symbolic
                ? this.names.find((name) => name.isSymbolic())
                : undefined;
            if (symbolicMatch) return symbolicMatch;
        }

        // Build the list of preferred languages
        const locales = Array.isArray(preferred) ? preferred : [preferred];
        // Find the first preferred locale with an exact match.
        return getPreferredName(
            locales,
            this.names.filter((name) => !name.isSymbolic()),
        );
    }

    getFirst(): string | undefined {
        return this.names[0]?.getName();
    }

    getNameInLanguage(lang: LanguageCode, symbolic: boolean | undefined) {
        return this.names.find(
            (name) =>
                name.getLanguage() === lang &&
                (symbolic === undefined || name.isSymbolic() === symbolic),
        );
    }

    getLocaleNames(locales: Locales) {
        return this.names
            .filter(
                (name) =>
                    name.isSymbolic() ||
                    name.language === undefined ||
                    locales
                        .getLocales()
                        .some(
                            (l) =>
                                name.language !== undefined &&
                                name.language.isLocaleLanguage(l),
                        ),
            )
            .map((n) => n.getName());
    }

    getNames() {
        return this.names
            .map((a) => a.getName())
            .filter((n): n is string => n !== undefined);
    }

    getLowerCaseNames() {
        return this.names
            .map((a) =>
                a
                    .getName()
                    ?.toLocaleLowerCase(a.getLanguage()?.substring(0, 2)),
            )
            .filter((n): n is string => n !== undefined);
    }

    hasName(name: string) {
        return this.names.find((a) => a.getName() === name) !== undefined;
    }

    getNameStartingWith(prefix: string) {
        return this.names.find((name) => name.startsWith(prefix));
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Names;
    getLocalePath() {
        return Names.LocalePath;
    }

    withName(name: string, language: LanguageCode) {
        const index = this.names.findIndex(
            (name) => name.getLanguage() === language,
        );

        const newName = Name.make(name, Language.make(language));
        return new Names(
            index < 0
                ? [...this.names, newName]
                : [
                      ...this.names.slice(0, index),
                      newName,
                      ...this.names.slice(index + 1),
                  ],
        );
    }

    getCharacter() {
        return { symbols: this.getNames()[0], emotion: Emotion.kind };
    }
}
