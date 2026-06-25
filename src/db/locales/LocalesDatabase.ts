import { Basis } from '@basis/Basis';
import Fonts from '@basis/Fonts';
import type HowTo from '@concepts/HowTo';
import {
    bundleEntryToHowTo,
    HowToIDs,
    parseHowTo,
    type HowToBundle,
} from '@concepts/HowTo';
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
import {
    DEFAULT_TUTORIAL_MODE,
    type TutorialMode,
} from '../../tutorial/TutorialMode';
import type Setting from '@db/settings/Setting';
import versioned from '@db/locales/versioned';

/** Per-locale emoji translations, keyed by the codepoint hex (e.g. "1F600",
 * "0023 FE0F 20E3") used in static/unicode/codes.txt. Each value is an
 * array whose first element is the display name and remaining elements are
 * additional searchable keywords, sourced from Unicode CLDR. */
export type EmojiEntry = readonly [name: string, ...keywords: string[]];
export type EmojiMap = Record<string, EmojiEntry>;

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

    /**
     * True once the initial preferred locales have finished loading, preventing
     * a flash of the default locale. Initialized in the constructor based on
     * whether all requested locales are already available synchronously (i.e.,
     * the en-US-only case where the bundled defaultLocale is enough), so that
     * hydration of the prerendered landing page doesn't briefly hide content.
     */
    readonly localesReady: Writable<boolean>;

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

    /** Per-locale emoji translations, keyed by codepoint hex. Each value is
     * [displayName, ...keywords] from CLDR. Loaded on demand (large files,
     * only needed for emoji search and tooltips). The store fires when a new
     * locale's data finishes loading so consumers can re-render. */
    readonly emojis: Writable<Partial<Record<SupportedLocale, EmojiMap>>> =
        writable({});

    /** In-flight or completed emoji loads per locale, kept on the instance so
     * concurrent callers share the same fetch. */
    private emojisLoading: Partial<
        Record<SupportedLocale, Promise<EmojiMap | undefined>>
    > = {};

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
        // Mark ready once the initial preferred locales are loaded, so the UI can avoid rendering in the default locale first.
        const requested = Array.from(
            new Set([...locales, ...this.setting.get()]),
        );

        // If everything we need is already loaded synchronously (the common
        // en-US case, since the defaultLocale was just inserted above), start
        // ready=true so the prerendered landing page doesn't get hidden during
        // hydration. Non-en-US users start ready=false; the locale-loading
        // CSS class set by /scripts/locale-preload.js keeps the body invisible
        // for them until this writable flips true.
        const allAvailable = requested.every(
            (l) => this.localesLoaded[l] !== undefined,
        );
        this.localesReady = writable(allAvailable);

        this.loadLocales(requested).then(() => this.localesReady.set(true));
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
        return await fetch(versioned(path))
            .then(async (response) =>
                response.ok ? await response.text() : undefined,
            )
            .catch(() => undefined);
    }

    getHowToURL(locale: SupportedLocale) {
        return `/locales/${locale}/${locale}-how.json`;
    }

    /** For the given locale, load the how to documents from the per-locale bundle, with
     * fallbacks as necessary. The bundle is generated at build time from the authoring
     * .txt files (see src/util/verify-locales/buildHowTos.ts), so this is a single request
     * regardless of how many how-tos exist. */
    async loadHowTos(locale: SupportedLocale): Promise<HowTo[]> {
        const existingHowTos = get(this.howTos)[locale];
        if (existingHowTos !== undefined) return existingHowTos;

        const loadBundle = async (
            locale: SupportedLocale,
        ): Promise<HowTo[] | undefined> => {
            try {
                const response = await fetch(
                    versioned(this.getHowToURL(locale)),
                );
                if (!response.ok) return undefined;
                const bundle = (await response.json()) as HowToBundle;
                return bundle.map((entry) => bundleEntryToHowTo(entry));
            } catch (_) {
                return undefined;
            }
        };

        const getHowTos = async (locale: SupportedLocale): Promise<HowTo[]> => {
            // Load the whole locale's how-tos in one request, falling back to en-US.
            const howTos =
                (await loadBundle(locale)) ??
                (locale === 'en-US' ? undefined : await loadBundle('en-US'));
            if (howTos !== undefined) return howTos;

            // In dev, the bundle may be missing (e.g. a newly added how-to not yet built);
            // fall back to loading the individual .txt files so authoring works without a build.
            if (import.meta.env.DEV) return this.loadHowTosFromFiles(locale);

            return [];
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

    /** Dev-only fallback: load and parse each how-to .txt individually when no bundle exists. */
    private async loadHowTosFromFiles(
        locale: SupportedLocale,
    ): Promise<HowTo[]> {
        const howTos: HowTo[] = [];
        for (const howID of HowToIDs) {
            // gallery how-tos are not stored in /static
            if (howID === 'gallery-how-to') continue;

            const path = `/locales/${locale}/how/${howID}.txt`;
            const fallback = `/locales/en-US/how/${howID}.txt`;
            const text =
                (await this.loadHowTo(path)) ??
                (await this.loadHowTo(fallback));

            if (text !== undefined) {
                const { how, error } = parseHowTo(howID, text);
                if (how !== null) howTos.push(how);
                else if (error) console.log(error);
            }
        }
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
                    fetch(versioned(path))
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

    getWritingLayout() {
        return get(this.locales).getLayout();
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

    /** Load the emoji translation map for a single locale. The data is large
     * (~500KB-1.3MB pretty-printed), so we fetch on demand and cache. */
    async loadEmojis(locale: SupportedLocale): Promise<EmojiMap | undefined> {
        const existing = get(this.emojis)[locale];
        if (existing) return existing;
        const inflight = this.emojisLoading[locale];
        if (inflight) return inflight;

        const promise = (async () => {
            try {
                const path = `/locales/${locale}/${locale}-emojis.json`;
                const response = await fetch(path);
                if (!response.ok) return undefined;
                const data = (await response.json()) as EmojiMap;
                this.emojis.update((current) => ({
                    ...current,
                    [locale]: data,
                }));
                return data;
            } catch (_) {
                return undefined;
            } finally {
                delete this.emojisLoading[locale];
            }
        })();

        this.emojisLoading[locale] = promise;
        return promise;
    }

    /** Ensure emoji data is loaded for the currently selected locales, in
     * parallel. Returns once all have resolved (loaded or failed). */
    async loadEmojisForCurrentLocales(): Promise<void> {
        const codes = this.setting.get();
        await Promise.all(codes.map((locale) => this.loadEmojis(locale)));
    }

    getTutorialURL(locale: string, mode: TutorialMode = DEFAULT_TUTORIAL_MODE) {
        // The "complete" tutorial keeps its original filename for back-compat; other modes get
        // a suffix (e.g. en-US-tutorial-quick.json).
        const suffix = mode === DEFAULT_TUTORIAL_MODE ? '' : `-${mode}`;
        return `/locales/${locale}/${locale}-tutorial${suffix}.json`;
    }

    async getTutorial(
        language: LanguageCode,
        regions: RegionCode[],
        mode: TutorialMode = DEFAULT_TUTORIAL_MODE,
        /** Bypass and refresh the cache; used by tutorial-file hot reloading in dev. */
        refresh = false,
    ): Promise<Tutorial | undefined> {
        const localeString = `${language}${regions.map((r) => `-${r}`).join('')}`;
        const cacheKey = `${localeString}:${mode}`;

        if (!refresh && cacheKey in this.tutorialsLoaded)
            return this.tutorialsLoaded[cacheKey];

        let tutorial: Tutorial | undefined;
        try {
            // Load the locale's tutorial, if it exists.
            const response = await fetch(
                versioned(this.getTutorialURL(localeString, mode)),
            );
            tutorial = await response.json();
        } catch (err) {
            // Couldn't load it? Fallback to english.
            tutorial = await (
                await fetch(versioned(this.getTutorialURL('en-US', mode)))
            ).json();
        }

        this.tutorialsLoaded[cacheKey] = tutorial;

        return tutorial;
    }
}
