import { Basis } from '@basis/Basis';
import Fonts from '@basis/Fonts';
import type HowTo from '@concepts/HowTo';
import { HowToIDs, parseHowTo } from '@concepts/HowTo';
import type { Database } from '@db/Database';
import { type Concretizer } from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import type LanguageCode from '@locale/LanguageCode';
import { localeToString } from '@locale/Locale';
import Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
import {
    SupportedLocales,
    type SupportedLocale,
} from '@locale/SupportedLocales';
import { get, writable, type Writable } from 'svelte/store';
import type Tutorial from '../../tutorial/Tutorial';
import type Setting from '../settings/Setting';

/** A singleton cache of loaded locales */
export default class LocalesDatabase {
    /** The concretizer */
    private readonly concretize: Concretizer;

    /** The database these locales are stored in */
    private readonly database: Database;

    /** The default locale */
    private readonly defaultLocale: LocaleText;

    /** A reactive store of preferred locales based on the selected languages. */
    readonly locales: Writable<Locales> = writable(DefaultLocales);

    /** The locales loaded, loading, or failed to load. */
    private localesLoaded: Record<
        SupportedLocale,
        LocaleText | Promise<LocaleText | undefined> | undefined
    > = {} as Record<
        SupportedLocale,
        LocaleText | Promise<LocaleText | undefined> | undefined
    >;

    /** The setting for the locales */
    readonly setting: Setting<SupportedLocale[]>;

    private tutorialsLoaded: Record<string, Tutorial | undefined> = {};

    /** The loaded and parsed how to's, by locale. Undefined means not loaded, "loading" means already requested but not resolved */
    readonly howTos: Writable<
        Record<SupportedLocale, HowTo[] | undefined | Promise<HowTo[]>>
    > = writable({});

    constructor(
        database: Database,
        locales: SupportedLocale[],
        defaultLocale: LocaleText,
        concretize: Concretizer,
        setting: Setting<SupportedLocale[]>,
    ) {
        this.database = database;
        this.concretize = concretize;
        this.defaultLocale = defaultLocale;

        // Store the default locale
        this.localesLoaded[localeToString(defaultLocale) as SupportedLocale] =
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
    ): Promise<LocaleText[]> {
        // Asynchronously load all unloaded locales.
        const locales = (
            await Promise.all(
                preferredLocales.map(async (locale) =>
                    this.loadLocale(locale, refresh),
                ),
            )
        ).filter((locale): locale is LocaleText => locale !== undefined);

        // Ask fonts to load the locale's preferred fonts.
        Fonts.loadLocales(locales);

        // Update locales
        this.syncLocales();

        return locales;
    }

    async loadHowTo(path: string): Promise<string | undefined> {
        return await fetch(path)
            .then(async (response) =>
                response.ok ? await response.text() : undefined,
            )
            .catch(() => undefined);
    }

    /** For the given locale, load the how to documents, with fallbacks as necessary */
    async loadHowTos(locale: SupportedLocale): Promise<HowTo[]> {
        const existingHowTos = get(this.howTos)[locale];
        if (existingHowTos !== undefined) return existingHowTos;

        const getHowTos = async (locale: SupportedLocale) => {
            const howTos: HowTo[] = [];

            for (const howID of HowToIDs) {
                // gallery how-tos are not stored in /static
                if (howID === 'gallery-how-to') continue;

                const path = `/locales/${locale}/how/${howID}.txt`;
                const fallback = `/locales/en-US/how/${howID}.txt`;
                let text =
                    (await this.loadHowTo(path)) ??
                    (await this.loadHowTo(fallback));

                if (text !== undefined) {
                    const { how, error } = parseHowTo(howID, text);
                    if (how !== null) {
                        howTos.push(how);
                    } else if (error) console.log(error);
                }
            }
            return howTos;
        };

        const promise = getHowTos(locale);

        const temp = { ...get(this.howTos) };
        temp[locale] = promise;
        this.howTos.set(temp);

        // Cache the loaded how tos
        const updated = { ...get(this.howTos) };
        const howTos = await promise;
        updated[locale] = howTos;
        this.howTos.set(updated);

        return howTos;
    }

    getHowTos(locale: SupportedLocale): HowTo[] | undefined {
        const howTos = get(this.howTos)[locale];
        if (howTos instanceof Promise) return undefined;
        return howTos;
    }

    getHowTo(locale: SupportedLocale, id: string): HowTo | undefined {
        return this.getHowTos(locale)?.find((h) => h.id === id);
    }

    syncLocales() {
        // Update the locales stores if it's changed.
        const newLocales = new Locales(
            this.concretize,
            this.computeLocales(),
            DefaultLocale,
        );
        if (!newLocales.isEqualTo(get(this.locales)))
            this.locales.set(newLocales);
    }

    async loadLocale(
        lang: SupportedLocale,
        refresh: boolean,
    ): Promise<LocaleText | undefined> {
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

    getLocales(): LocaleText[] {
        return get(this.locales).getLocales();
    }

    getLocale(): LocaleText {
        return this.getLocales()[0];
    }

    private computeLocales(): LocaleText[] {
        const selected = this.setting
            .get()
            .map((locale) => this.localesLoaded[locale])
            .filter(
                (locale): locale is LocaleText =>
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
    async setLocales(
        preferredLocales: SupportedLocale[],
    ): Promise<LocaleText[]> {
        // Update the configuration with the new languages, regardless of whether we successfully loaded them.
        this.setting.set(this.database, preferredLocales);

        // Try to load locales for the requested languages
        const locales = await this.loadLocales(preferredLocales);

        // Revise all projects to have the new locale
        this.database.Projects.localize(locales);

        // Sync the locales store to update all uses of the current locales.
        this.syncLocales();

        return locales;
    }

    getTutorialURL(locale: string) {
        return `/locales/${locale}/${locale}-tutorial.json`;
    }

    async getTutorial(
        language: LanguageCode,
        regions: RegionCode[],
    ): Promise<Tutorial | undefined> {
        const localeString = `${language}${regions.map((r) => `-${r}`).join('')}`;

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
