<svelte:options />

<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import Link from '@components/app/Link.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import LocaleSearch, {
        allLanguageOptions,
        allRegionOptions,
        bestMatch,
        filterLocalesByQuery,
        matchLanguages,
        matchRegions,
    } from '@components/settings/LocaleSearch.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Synced from '@components/widgets/Synced.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { LocaleDialogID } from '@components/widgets/dialogIDs';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Options from '@components/widgets/Options.svelte';
    import type { Snippet } from 'svelte';
    import { locales } from '@db/Database';
    import { getFunctionsInstance } from '@db/firebase';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import { getLocaleLanguageName, isLocaleDraft } from '@locale/LocaleText';
    import {
        SupportedLocales,
        type SupportedLocale,
    } from '@locale/SupportedLocales';
    import {
        CANCEL_SYMBOL,
        LOCALE_SYMBOL,
        MACHINE_TRANSLATED_SYMBOL,
    } from '@parser/Symbols';

    interface Props {
        /** Determines whether to show locale menu button (footer vs. speech bubble) */
        show?: boolean;
        showButton?: boolean;
        /** Greet a visitor who hasn't chosen a language yet (#1256): drop the sections
         *  that assume a choice was already made, and close once they choose. */
        prompt?: boolean;
        /** Shown in place of the header and the "Selected" section in prompt mode. Passed
         *  in rather than built here so that the phrase table and its rotation load with
         *  the prompt, not with every page that mounts the chooser. */
        banner?: Snippet;
    }

    let {
        show = $bindable(false),
        showButton = true,
        prompt = false,
        banner,
    }: Props = $props();

    let selectedLocales = $state<string[]>([]);
    $effect(() => {
        selectedLocales = $locales
            .getPreferredLocales()
            .map((locale) => localeToString(locale)) as SupportedLocale[];
    });

    /** A query that filters the available locales by native name, Latin name, or region. */
    let query = $state('');

    let availableLocales = $derived(
        filterLocalesByQuery(
            // Nothing is really "selected" yet when we're asking, so offer every
            // language — otherwise the one currently in force, English, is the single
            // language a first-time visitor can't pick.
            SupportedLocales.filter(
                (supported) => prompt || !selectedLocales.includes(supported),
            ),
            query,
            (code) => stringToLocale(code),
            $locales.getLanguages(),
        ),
    );

    // ─── Request-a-language form state ────────────────────────────────────
    const userStore = getUser();
    let requestLanguage = $state<string | undefined>(undefined);
    let requestRegion = $state<string | undefined>(undefined);
    let requestStatus = $state<'idle' | 'submitting' | 'success' | 'error'>(
        'idle',
    );
    let requestIssueUrl = $state<string | undefined>(undefined);
    /** Whether the returned issue already existed, so we can say so rather than
     *  implying the request opened a new discussion. */
    let requestExisting = $state(false);
    let requestErrorKey = $state<
        'error' | 'alreadySupported' | 'requiresLogin' | undefined
    >(undefined);

    /** One search box filters both dropdowns: several hundred languages and regions are
     *  unnavigable as plain menus (#1256). Each falls back to its full list when the
     *  query matches nothing on that axis, so a region query doesn't empty the
     *  language menu. */
    let requestQuery = $state('');
    let languageMatches = $derived(
        matchLanguages(requestQuery, $locales.getLanguages()),
    );
    let regionMatches = $derived(
        matchRegions(requestQuery, $locales.getLanguages()),
    );
    // A query that names a country shouldn't empty the language menu, and vice versa:
    // an axis the query says nothing about keeps its full list, so the other dropdown
    // is still usable without clearing the box.
    let languageOptions = $derived(
        languageMatches.length > 0 ? languageMatches : allLanguageOptions(),
    );
    let regionOptions = $derived(
        regionMatches.length > 0 ? regionMatches : allRegionOptions(),
    );

    /** Auto-select the best prefix match, but only when the query itself changes, so
     *  that picking a different option from either menu afterwards sticks. */
    let autoSelectedFor: string | undefined = undefined;
    $effect(() => {
        const query = requestQuery;
        if (query === autoSelectedFor) return;
        autoSelectedFor = query;
        const best = bestMatch(query, $locales.getLanguages());
        if (best.language !== undefined) requestLanguage = best.language;
        if (best.region !== undefined) requestRegion = best.region;
    });

    let requestedLocale = $derived(
        requestLanguage && requestRegion
            ? `${requestLanguage}-${requestRegion}`
            : undefined,
    );
    let requestedAlreadySupported = $derived(
        requestedLocale !== undefined &&
            SupportedLocales.includes(requestedLocale as SupportedLocale),
    );
    let requestSubmitDisabled = $derived(
        requestStatus === 'submitting' ||
            requestLanguage === undefined ||
            requestRegion === undefined ||
            requestedAlreadySupported,
    );

    async function submitRequest() {
        if (
            requestLanguage === undefined ||
            requestRegion === undefined ||
            requestedAlreadySupported
        )
            return;
        if (!$userStore) {
            requestStatus = 'error';
            requestErrorKey = 'requiresLogin';
            return;
        }
        const functions = await getFunctionsInstance();
        if (functions === undefined) {
            requestStatus = 'error';
            requestErrorKey = 'error';
            return;
        }
        requestStatus = 'submitting';
        requestErrorKey = undefined;
        requestIssueUrl = undefined;
        requestExisting = false;
        try {
            const { httpsCallable } = await import('firebase/functions');
            const submit = httpsCallable<
                { language: string; region: string },
                { issueUrl: string; existing?: boolean }
            >(functions, 'submitLocaleRequest');
            const response = await submit({
                language: requestLanguage,
                region: requestRegion,
            });
            requestIssueUrl = response.data.issueUrl;
            requestExisting = response.data.existing === true;
            requestStatus = 'success';
        } catch (e) {
            console.error('Locale request failed', e);
            requestStatus = 'error';
            requestErrorKey = 'error';
        }
    }

    function select(
        locale: SupportedLocale,
        action: 'remove' | 'replace' | 'add',
    ) {
        selectedLocales =
            // If removing, only remove if there's more than one.
            action === 'remove'
                ? selectedLocales.length > 1
                    ? selectedLocales.filter((l) => l !== locale)
                    : selectedLocales
                : // If replacing, just choose the single locale
                  action === 'replace'
                  ? [locale]
                  : // Put the selected locale at the end, removing it from the beginning if included
                    [...selectedLocales.filter((l) => l !== locale), locale];

        if (selectedLocales.length === 0) return;

        // The writing layout is no longer set from the locale here: the
        // writingLayout setting defaults to 'auto', which follows the active
        // locale's layout at render time, so an explicit choice isn't stomped.

        // All selected locales go into the URL joined by '+' (e.g. "en-US+es-MX").
        // The layout's $effect will call DB.Locales.setLocales() after navigation.
        const localeParam = selectedLocales.join('+');
        const currentLocale = page.params.locale;
        const currentPath = page.url.pathname;
        const pathWithoutLocale = currentLocale
            ? currentPath.slice(('/' + currentLocale).length) || '/'
            : currentPath;
        goto(
            `/${localeParam}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}${page.url.search}`,
        );

        // The prompt covers the page it's asking about, so get out of the way once
        // there's an answer. The layout records that we asked, however it ended.
        if (prompt) show = false;
    }
</script>

<!-- No `id` in prompt mode: the id syncs the dialog's open state into `?dialog=locale`,
     which would both dirty a first-time visitor's URL and force the picker open for
     anyone they shared that link with. -->
<Dialog
    id={prompt ? undefined : LocaleDialogID}
    bind:show
    wide
    height="75vh"
    header={prompt ? undefined : (l) => l.ui.dialog.locale.header}
    explanation={prompt ? undefined : (l) => l.ui.dialog.locale.explanation}
    button={showButton
        ? {
              testid: 'locale-chooser',
              tip: (l) => l.ui.dialog.locale.button.show,
              icon: selectedLocales.some((locale) => isLocaleDraft(locale))
                  ? MACHINE_TRANSLATED_SYMBOL
                  : LOCALE_SYMBOL,
              label: selectedLocales
                  .map((code) => getLocaleLanguageName(code))
                  .join(' + '),
              background: true,
          }
        : undefined}
>
    {#if prompt}
        {@render banner?.()}
    {:else}
        <MarkupHTMLView markup={(l) => l.ui.dialog.locale.localizeHelp} />

        <!-- The badge sits beside the heading rather than inside it: an
             aria-label on a child would fold into the heading's own name. Absent
             in prompt mode, where a first-time visitor has no account yet. -->
        <div class="subheader">
            <h2
                >{$locales
                    .concretize((l) => l.ui.dialog.locale.subheader.selected)
                    .toText()}</h2
            >
            <Synced />
        </div>

        <div class="languages">
            {#each selectedLocales as selected (selected)}
                {#if selectedLocales.length > 1}
                    <Button
                        action={() => select(selected, 'remove')}
                        tip={(l) => l.ui.dialog.locale.button.remove}
                        icon={CANCEL_SYMBOL}
                        background
                    >
                        <LocaleName locale={selected} supported /></Button
                    >
                {:else}
                    <!-- The last remaining language can never be removed, so a disabled
                         button only makes it harder to read. Show the name plainly. -->
                    <span class="only"
                        ><LocaleName locale={selected} supported /></span
                    >
                {/if}
            {/each}
        </div>
    {/if}
    <div class="available-header">
        {#if !prompt}
            <h2
                >{$locales
                    .concretize((l) => l.ui.dialog.locale.subheader.supported)
                    .toText()}</h2
            >
        {/if}
        <LocaleSearch id="locale-available-search" bind:query />
    </div>
    <div class="supported">
        {#each availableLocales as supported (supported)}
            <div class="option">
                <Button
                    action={() => select(supported, 'replace')}
                    tip={(l) => l.ui.dialog.locale.button.replace}
                    background
                >
                    <LocaleName locale={supported} supported />
                </Button>

                <Button
                    action={() => select(supported, 'add')}
                    tip={(l) => l.ui.dialog.locale.button.add}
                    icon="+"
                    background
                />
            </div>
        {:else}&mdash;
        {/each}
    </div>

    <!-- Not while prompting: the request form and its dropdowns of language and
         country names are English-only, so they're no help to the very reader
         this is asking, who may not read the English page it covers. -->
    {#if !prompt}
        <h2
            >{$locales
                .concretize((l) => l.ui.dialog.locale.request.header)
                .toText()}</h2
        >
        <MarkupHTMLView
            markup={(l) => l.ui.dialog.locale.request.explanation}
        />

        <LocaleSearch
            id="locale-request-search"
            bind:query={requestQuery}
            placeholder={(l) => l.ui.dialog.locale.request.searchPlaceholder}
            description={(l) => l.ui.dialog.locale.request.searchDescription}
        />
        <div class="request-form">
            <Options
                label={(l) => l.ui.dialog.locale.request.languageLabel}
                value={requestLanguage}
                options={[
                    {
                        value: undefined,
                        label: (l) => l.ui.dialog.locale.request.languageLabel,
                    },
                    ...languageOptions,
                ]}
                change={(value) => (requestLanguage = value)}
            />
            <Options
                label={(l) => l.ui.dialog.locale.request.regionLabel}
                value={requestRegion}
                options={[
                    {
                        value: undefined,
                        label: (l) => l.ui.dialog.locale.request.regionLabel,
                    },
                    ...regionOptions,
                ]}
                change={(value) => (requestRegion = value)}
            />
            <Button
                action={submitRequest}
                tip={(l) => l.ui.dialog.locale.request.submit}
                active={!requestSubmitDisabled}
            >
                <LocalizedText
                    path={(l) => l.ui.dialog.locale.request.submit}
                />
            </Button>
        </div>
        {#if requestStatus === 'submitting'}
            <p class="request-status"
                ><Spinning></Spinning>
                <LocalizedText
                    path={(l) => l.ui.dialog.locale.request.submitting}
                /></p
            >
        {:else if requestStatus === 'success' && requestIssueUrl}
            <p class="request-status">
                <Link external to={requestIssueUrl}>
                    {#if requestExisting}
                        <LocalizedText
                            path={(l) =>
                                l.ui.dialog.locale.request.alreadyRequested}
                        />
                    {:else}
                        <LocalizedText
                            path={(l) => l.ui.dialog.locale.request.success}
                        />
                    {/if}
                </Link>
            </p>
        {:else if requestStatus === 'error' && requestErrorKey}
            <p class="request-status request-error">
                <LocalizedText
                    path={(l) => l.ui.dialog.locale.request[requestErrorKey!]}
                />
            </p>
        {:else if requestedAlreadySupported}
            <p class="request-status request-error">
                <LocalizedText
                    path={(l) => l.ui.dialog.locale.request.alreadySupported}
                />
            </p>
        {/if}
    {/if}
</Dialog>

<style>
    /* Keeps the cloud on the heading's baseline instead of starting a line of
       its own under it. */
    .subheader {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing-half);
        align-items: baseline;
    }

    .available-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
    }

    /* A wrapping grid rather than a single column: the dialog is as wide as the
       window allows, and thirty stacked rows left the whole right side empty. */
    .supported {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(14em, 1fr));
        gap: calc(2 * var(--wordplay-spacing));
        align-items: start;
    }

    .languages {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
    }

    /* The one remaining language, which has no remove action. Matches a background
       button's box so it sits level with them, without the affordance. */
    .only {
        display: inline-block;
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .request-form {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing) 0;
    }

    .request-status {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        margin-block-start: var(--wordplay-spacing-half);
    }

    .request-error {
        color: var(--wordplay-error);
    }

    .option {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
