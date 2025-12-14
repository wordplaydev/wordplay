<svelte:options />

<script lang="ts">
    import { DB, locales } from '@db/Database';
    import type LanguageCode from '@locale/LanguageCode';
    import { getLanguageLayout, PossibleLanguages } from '@locale/LanguageCode';
    import {
        SupportedLocales,
        type SupportedLocale,
    } from '@locale/SupportedLocales';
    import {
        CANCEL_SYMBOL,
        DRAFT_SYMBOL,
        EMOJI_SYMBOL,
        LOCALE_SYMBOL,
    } from '@parser/Symbols';
    import { Settings } from '../../db/Database';
    import { localeToString } from '../../locale/Locale';
    import {
        getLocaleLanguage,
        getLocaleLanguageName,
        isLocaleDraft,
    } from '../../locale/LocaleText';
    import Link from '../app/Link.svelte';
    import Button from '../widgets/Button.svelte';
    import Dialog from '../widgets/Dialog.svelte';
    import LocaleName from './LocaleName.svelte';

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

        // Set the layout and direction based on the preferred language.
        if (selectedLocales.length > 0) {
            Settings.setWritingLayout(
                getLanguageLayout(
                    getLocaleLanguage(selectedLocales[0]) as LanguageCode,
                ),
            );
            // Save setLocales
            DB.Locales.setLocales(selectedLocales as SupportedLocale[]);
        }
    }
</script>

<Dialog
    bind:show
    header={(l) => l.ui.dialog.locale.header}
    explanation={(l) => l.ui.dialog.locale.explanation}
    button={showButton
        ? {
              tip: (l) => l.ui.dialog.locale.button.show,
              icon: selectedLocales.some((locale) => isLocaleDraft(locale))
                  ? DRAFT_SYMBOL
                  : LOCALE_SYMBOL,
              label: selectedLocales
                  .map((code) => getLocaleLanguageName(code))
                  .join(' + '),
          }
        : undefined}
>
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
            >
                <LocaleName locale={selected} supported /></Button
            >
        {/each}
    </div>
    <h2
        >{$locales
            .concretize((l) => l.ui.dialog.locale.subheader.supported)
            .toText()}</h2
    >
    <div class="supported">
        {#each SupportedLocales.filter((supported) => !selectedLocales.includes(supported)) as supported (supported)}
            <div class="option">
                <Button
                    action={() => select(supported, 'replace')}
                    tip={(l) => l.ui.dialog.locale.button.replace}
                >
                    <LocaleName locale={supported} supported />
                </Button>

                <Button
                    action={() => select(supported, 'add')}
                    tip={(l) => l.ui.dialog.locale.button.add}
                    icon="+"
                />
            </div>
        {/each}
    </div>

    <h2
        ><Link
            external
            to="https://github.com/wordplaydev/wordplay/wiki/localize"
            >{$locales
                .concretize((l) => l.ui.dialog.locale.subheader.help)
                .toText()}</Link
        ></h2
    >
    <div class="languages">
        {#each PossibleLanguages.filter((lang) => lang !== EMOJI_SYMBOL && !SupportedLocales.some((locale) => getLocaleLanguage(locale) === lang)) as lang}
            <LocaleName locale={lang} supported={false} />
        {/each}
        ...
    </div>
</Dialog>

<style>
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
</style>
