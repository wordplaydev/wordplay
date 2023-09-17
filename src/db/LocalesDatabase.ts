import { derived, get, writable, type Writable } from 'svelte/store';
import type Locale from '../locale/Locale';
import { Database, DefaultLocale } from './Database';
import { getLanguageDirection } from '../locale/LanguageCode';
import { SupportedLocales, type SupportedLocale } from '../locale/Locale';
import Fonts from '../basis/Fonts';
import { Basis } from '../basis/Basis';
import type Setting from './Setting';
import type LanguageCode from '../locale/LanguageCode';
import type { RegionCode } from '../locale/Regions';
import type Tutorial from '../tutorial/Tutorial';

/** A cache of locales loaded */
export default class LocalesDatabase {
    /** The database these locales are stored in */
    private readonly database: Database;

    /** The default locale */
    private readonly defaultLocale: Locale;

    /** Derived stores based on selected locales. */
    readonly locales: Writable<Locale[]> = writable([DefaultLocale]);
    readonly locale = derived(this.locales, ($locales) => $locales[0]);
    readonly languages = derived(this.locales, ($locales) =>
        $locales.map((locale) => locale.language)
    );
    readonly writingDirection = derived(this.locales, ($locales) =>
        getLanguageDirection($locales[0].language)
    );

    /** The locales loaded, loading, or failed to load. */
    private localesLoaded: Record<
        SupportedLocale,
        Locale | Promise<Locale | undefined> | undefined
    > = {} as Record<
        SupportedLocale,
        Locale | Promise<Locale | undefined> | undefined
    >;

    /** The setting for the locales */
    readonly setting: Setting<SupportedLocale[]>;

    private tutorialsLoaded: Record<string, Tutorial | undefined> = {};

    constructor(
        database: Database,
        locales: SupportedLocale[],
        defaultLocale: Locale,
        setting: Setting<SupportedLocale[]>
    ) {
        this.database = database;
        this.defaultLocale = defaultLocale;

        // Store the default locale
        this.localesLoaded[
            `${defaultLocale.language}-${defaultLocale.region}` as SupportedLocale
        ] = defaultLocale;

        this.setting = setting;

        // Load the requested locales.
        this.loadLocales(locales);
    }

    async refreshLocales() {
        this.loadLocales(SupportedLocales.slice(), true);
    }

    async loadLocales(
        preferredLocales: SupportedLocale[],
        refresh = false
    ): Promise<Locale[]> {
        // Asynchronously load all unloaded locales.
        const locales = (
            await Promise.all(
                preferredLocales.map(async (locale) =>
                    this.loadLocale(locale, refresh)
                )
            )
        ).filter((locale): locale is Locale => locale !== undefined);

        // Ask fonts to load the locale's preferred fonts.
        Fonts.loadLocales(locales);

        // Update the locales stores
        this.locales.set(
            this.setting
                .get()
                .map((l) => this.localesLoaded[l])
                .filter(
                    (l): l is Locale =>
                        l !== undefined && !(l instanceof Promise)
                )
        );

        return locales;
    }

    async loadLocale(
        lang: SupportedLocale,
        refresh: boolean
    ): Promise<Locale | undefined> {
        // Already checked and it doesn't exist? Just return undefined.
        if (
            !refresh &&
            Object.hasOwn(this.localesLoaded, lang) &&
            this.localesLoaded[lang] === undefined
        )
            return undefined;

        // Is this en-US? We bundle it. Bail.
        if (lang === 'en-US') return DefaultLocale;

        const current = this.localesLoaded[lang];

        // Are we in the middle of getting it? Return the promise we already made.
        if (current instanceof Promise) {
            return current;
        }
        // If we don't already have it, make a promise to load it.
        else if (current === undefined || refresh) {
            try {
                const path = `/locales/${lang}/${lang}.json`;
                const promise =
                    // First, see if the locale exists
                    fetch(path)
                        .then(async (response) =>
                            response.ok ? await response.json() : undefined
                        )
                        .catch(() => undefined);
                this.localesLoaded[lang] = promise;
                const locale = await promise;
                this.localesLoaded[lang] = locale;
                return locale;
            } catch (_) {
                this.localesLoaded[lang] = undefined;
                return undefined;
            }
        } else return current;
    }

    getLocales(): Locale[] {
        // Map preferred languages into locales, filtering out missing locales.
        const locales = this.setting
            .get()
            .map((locale) => this.localesLoaded[locale])
            .filter(
                (locale): locale is Locale =>
                    locale !== undefined && !(locale instanceof Promise)
            );
        return locales.length === 0 ? [this.defaultLocale] : locales;
    }

    getLocale(): Locale {
        return this.getLocales()[0];
    }

    getLocaleBasis(): Basis {
        return Basis.getLocalizedBasis(this.getLocales());
    }

    getLanguages(): LanguageCode[] {
        return this.getLocales().map((locale) => locale.language);
    }

    getWritingDirection() {
        return get(this.writingDirection);
    }

    /** Set the languages, load all locales if they aren't loaded, revise all projects to include any new locales, and save the new configuration. */
    async setLocales(preferredLocales: SupportedLocale[]) {
        // Update the configuration with the new languages, regardless of whether we successfully loaded them.
        this.setting.set(this.database, preferredLocales);

        // Try to load locales for the requested languages
        const locales = await this.loadLocales(preferredLocales);

        // Revise all projects to have the new locale
        this.database.Projects.localize(locales);
    }

    async getTutorial(
        language: LanguageCode,
        region: RegionCode
    ): Promise<Tutorial | undefined> {
        const localeString = `${language}-${region}`;

        if (localeString in this.tutorialsLoaded)
            return this.tutorialsLoaded[localeString];

        let tutorial: Tutorial | undefined;
        try {
            // Load the locale's tutorial, if it exists.
            const response = await fetch(
                `/locales/${localeString}/${localeString}-tutorial.json`
            );
            tutorial = await response.json();
        } catch (err) {
            // Couldn't load it? Show an error.
            tutorial = undefined;
        }

        this.tutorialsLoaded[localeString] = tutorial;

        return tutorial;
    }
}
