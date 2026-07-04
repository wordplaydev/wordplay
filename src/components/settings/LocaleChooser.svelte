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
        filterLocalesByQuery,
    } from '@components/settings/LocaleSearch.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Options from '@components/widgets/Options.svelte';
    import { locales } from '@db/Database';
    import { functions } from '@db/firebase';
    import { Languages } from '@locale/LanguageCode';
    import { localeToString, stringToLocale } from '@locale/Locale';
    import { getLocaleLanguageName, isLocaleDraft } from '@locale/LocaleText';
    import { Regions } from '@locale/Regions';
    import {
        SupportedLocales,
        type SupportedLocale,
    } from '@locale/SupportedLocales';
    import {
        CANCEL_SYMBOL,
        LOCALE_SYMBOL,
        MACHINE_TRANSLATED_SYMBOL,
    } from '@parser/Symbols';
    import { httpsCallable } from 'firebase/functions';

    interface Props {
        /** Determines whether to show locale menu button (footer vs. speech bubble) */
        show?: boolean;
        showButton?: boolean;
    }

    let { show = $bindable(false), showButton = true }: Props = $props();

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
            SupportedLocales.filter(
                (supported) => !selectedLocales.includes(supported),
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
    let requestErrorKey = $state<
        'error' | 'alreadySupported' | 'requiresLogin' | undefined
    >(undefined);

    /** Language dropdown options: every language in our metadata, alphabetized
     *  by native name. The submit guard rejects already-supported combinations. */
    const languageOptions = Object.entries(Languages)
        .map(([code, meta]) => ({
            value: code,
            label: `${meta.name} (${meta.en})`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

    /** Region dropdown options: every ISO 3166 alpha-2 code, sorted by English name. */
    const regionOptions = Object.entries(Regions)
        .map(([code, meta]) => ({ value: code, label: `${meta.en} (${code})` }))
        .sort((a, b) => a.label.localeCompare(b.label));

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
        if (functions === undefined) {
            requestStatus = 'error';
            requestErrorKey = 'error';
            return;
        }
        requestStatus = 'submitting';
        requestErrorKey = undefined;
        requestIssueUrl = undefined;
        try {
            const submit = httpsCallable<
                { language: string; region: string },
                { issueUrl: string }
            >(functions, 'submitLocaleRequest');
            const response = await submit({
                language: requestLanguage,
                region: requestRegion,
            });
            requestIssueUrl = response.data.issueUrl;
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
    }
</script>

<Dialog
    id="locale"
    bind:show
    height="75vh"
    header={(l) => l.ui.dialog.locale.header}
    explanation={(l) => l.ui.dialog.locale.explanation}
    button={showButton
        ? {
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
    <MarkupHTMLView markup={(l) => l.ui.dialog.locale.localizeHelp} />

    <h2
        >{$locales
            .concretize((l) => l.ui.dialog.locale.subheader.selected)
            .toText()}</h2
    >

    <div class="languages">
        {#each selectedLocales as selected (selected)}
            <Button
                action={() => select(selected, 'remove')}
                tip={(l) => l.ui.dialog.locale.button.remove}
                active={selectedLocales.length > 1}
                icon={selectedLocales.length > 1 ? CANCEL_SYMBOL : undefined}
                background
            >
                <LocaleName locale={selected} supported /></Button
            >
        {/each}
    </div>
    <div class="available-header">
        <h2
            >{$locales
                .concretize((l) => l.ui.dialog.locale.subheader.supported)
                .toText()}</h2
        >
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

    <h2
        >{$locales
            .concretize((l) => l.ui.dialog.locale.request.header)
            .toText()}</h2
    >
    <MarkupHTMLView markup={(l) => l.ui.dialog.locale.request.explanation} />

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
            <LocalizedText path={(l) => l.ui.dialog.locale.request.submit} />
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
                <LocalizedText
                    path={(l) => l.ui.dialog.locale.request.success}
                />
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
</Dialog>

<style>
    .available-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
    }

    .supported {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
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
