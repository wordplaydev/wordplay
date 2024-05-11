import { get, writable, type Writable } from 'svelte/store';
import type Locale from '../locale/Locale';
import type { Database } from './Database';
import {
    SupportedLocales,
    type SupportedLocale,
    toLocaleString,
} from '../locale/Locale';
import Fonts from '../basis/Fonts';
import { Basis } from '../basis/Basis';
import type Setting from './Setting';
import type LanguageCode from '../locale/LanguageCode';
import type { RegionCode } from '../locale/Regions';
import type Tutorial from '../tutorial/Tutorial';
import DefaultLocale, { DefaultLocales } from '../locale/DefaultLocale';
import Locales from '../locale/Locales';

/** A cache of locales loaded */
export default class LocalesDatabase {
    /** The database these locales are stored in */
    private readonly database: Database;

    /** The default locale */
    private readonly defaultLocale: Locale;

    /** A reactive store of preferred locales based on the selected languages. */
    readonly locales: Writable<Locales> = writable(DefaultLocales);

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
        setting: Setting<SupportedLocale[]>,
    ) {
        this.database = database;
        this.defaultLocale = defaultLocale;

        // Store the default locale
        this.localesLoaded[toLocaleString(defaultLocale) as SupportedLocale] =
            defaultLocale;

        this.setting = setting;

        // Load the requested locales, combining those given (from the browser) and those from the local storage settings.
        this.loadLocales(
            Array.from(new Set([...locales, ...this.setting.get()])),
        );
    }

    async refreshLocales() {
        this.loadLocales(SupportedLocales.slice(), true);
    }

    async loadLocales(
        preferredLocales: SupportedLocale[],
        refresh = false,
    ): Promise<Locale[]> {
        // Asynchronously load all unloaded locales.
        const locales = (
            await Promise.all(
                preferredLocales.map(async (locale) =>
                    this.loadLocale(locale, refresh),
                ),
            )
        ).filter((locale): locale is Locale => locale !== undefined);

        // Ask fonts to load the locale's preferred fonts.
        Fonts.loadLocales(locales);

        // Update locales
        this.syncLocales();

        return locales;
    }

    syncLocales() {
        // Update the locales stores if it's changed.
        const newLocales = new Locales(this.computeLocales(), DefaultLocale);
        if (!newLocales.isEqualTo(get(this.locales)))
            this.locales.set(newLocales);
    }

    async loadLocale(
        lang: SupportedLocale,
        refresh: boolean,
    ): Promise<Locale | undefined> {
        // Already checked and it doesn't exist? Just return undefined.
        if (
            !refresh &&
            Object.hasOwn(this.localesLoaded, lang) &&
            this.localesLoaded[lang] === undefined
        )
            return undefined;

        // Is this en-US? We bundle it. Bail.
        if (lang === 'en-US') return this.defaultLocale;

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
                            response.ok ? await response.json() : undefined,
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

    getLocaleSet() {
        return get(this.locales);
    }

    getLocales(): Locale[] {
        return get(this.locales).getLocales();
    }

    getLocale(): Locale {
        return this.getLocales()[0];
    }

    private computeLocales(): Locale[] {
        const selected = this.setting
            .get()
            .map((locale) => this.localesLoaded[locale])
            .filter(
                (locale): locale is Locale =>
                    locale !== undefined && !(locale instanceof Promise),
            );

        // Update the locales stores
        return selected.length === 0 ? [this.defaultLocale] : selected;
    }

    getLocaleBasis(): Basis {
        return Basis.getLocalizedBasis(this.getLocaleSet());
    }

    getLanguages(): LanguageCode[] {
        return this.getLocales().map((locale) => locale.language);
    }

    getWritingDirection() {
        return get(this.locales).getDirection();
    }

    /** Set the languages, load all locales if they aren't loaded, revise all projects to include any new locales, and save the new configuration. */
    async setLocales(preferredLocales: SupportedLocale[]): Promise<Locale[]> {
        // Update the configuration with the new languages, regardless of whether we successfully loaded them.
        this.setting.set(this.database, preferredLocales);

        // Try to load locales for the requested languages
        const locales = await this.loadLocales(preferredLocales);

        // Revise all projects to have the new locale
        this.database.Projects.localize(locales);

        return locales;
    }

    getTutorialURL(locale: string) {
        return `/locales/${locale}/${locale}-tutorial.json`;
    }

    async getTutorial(
        language: LanguageCode,
        region: RegionCode,
    ): Promise<Tutorial | undefined> {
        const localeString = `${language}-${region}`;

        if (localeString in this.tutorialsLoaded)
            return this.tutorialsLoaded[localeString];

        let tutorial: Tutorial | undefined;
        try {
            // Load the locale's tutorial, if it exists.
            const response = await fetch(this.getTutorialURL(localeString));
            tutorial = await response.json();
        } catch (err) {
            // Couldn't load it? Fallback to english.
            tutorial = await (await fetch(this.getTutorialURL('en-US'))).json();
        }

        this.tutorialsLoaded[localeString] = tutorial;

        return tutorial;
    }
}
