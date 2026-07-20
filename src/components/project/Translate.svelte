<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import LocaleSearch, {
        filterLocalesByQuery,
    } from '@components/settings/LocaleSearch.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { locales, Projects } from '@db/Database';
    import { getFunctionsInstance } from '@db/firebase';
    import type Project from '@db/projects/Project';
    import translateProject from '@db/projects/translate';
    import getTranslatableLocales from '@locale/getTranslatableLocales';
    import {
        localesAreEqual,
        localeToString,
        type Locale,
    } from '@locale/Locale';
    import { LOCALE_SYMBOL } from '@parser/Symbols';

    interface Props {
        project: Project;
        /** A callback to show all of the languages, so we can make them visible if editors are hiding them. */
        showAll: () => void;
    }

    let { project, showAll }: Props = $props();

    let translating: boolean = $state(false);
    let error: boolean = $state(false);
    let show: boolean = $state(false);

    let projectLocales = $derived(
        [...project.getLocalesUsed(), ...project.getLocales().getLocales()]
            .filter((l, index, list) => {
                const match = list.findIndex(
                    (l2, index2) => index2 > index && localesAreEqual(l, l2),
                );
                return match < 0;
            })
            .toSorted((a, b) =>
                localeToString(a).localeCompare(localeToString(b)),
            ),
    );

    let sourceLocale = $derived<Locale | undefined>(
        project.getLocales().getLocales()[0],
    );

    let targetLocale = $state<Locale | undefined>(undefined);

    /** A query that filters the destination languages by native name, Latin name, or region. */
    let query = $state('');

    let destinationLocales = $derived(
        filterLocalesByQuery(
            getTranslatableLocales(),
            query,
            (locale) => locale,
            $locales.getLanguages(),
        ),
    );

    /** Translate the project into another language */
    async function translate() {
        const functions = await getFunctionsInstance();
        if (functions && sourceLocale && targetLocale) {
            translating = true;
            const revisedProject = await translateProject(
                functions,
                project,
                sourceLocale,
                targetLocale,
            );
            translating = false;

            // If we were successful,
            if (revisedProject) {
                // Revise the project
                Projects.reviseProject(revisedProject);
                // Show the new translations.
                showAll();
                // Hide the dialog.
                show = false;
                // Reset the target locale.
                targetLocale = undefined;
            } else {
                error = true;
            }
        }
    }

    function updatePrimaryLocale(index: number) {
        sourceLocale = projectLocales[index];
    }
</script>

<Dialog
    id="translate"
    bind:show
    height="75vh"
    header={(l) => l.ui.project.dialog.translate.header}
    explanation={(l) => l.ui.project.dialog.translate.explanation}
    button={{
        tip: (l) => l.ui.project.button.translate.tip,
        icon: LOCALE_SYMBOL,
        label: (l) => l.ui.project.button.translate.label,
        background: true,
    }}
>
    <Subheader text={(l) => l.ui.project.subheader.source} />
    <div class="options">
        {#each projectLocales as locale, index}
            <div
                class="option"
                class:selected={sourceLocale !== undefined &&
                    localesAreEqual(locale, sourceLocale)}
            >
                <Button
                    action={() => updatePrimaryLocale(index)}
                    active={!translating &&
                        (sourceLocale === undefined ||
                            !localesAreEqual(locale, sourceLocale))}
                    tip={(l) => l.ui.project.button.primary}
                    background
                    ><LocaleName
                        locale={localeToString(locale)}
                        supported
                        showDraft={false}
                    /></Button
                >
            </div>
        {/each}
    </div>
    <div class="destination-header">
        <Subheader text={(l) => l.ui.project.subheader.destination} />
        <LocaleSearch
            id="translate-destination-search"
            placeholder={(l) =>
                l.ui.project.dialog.translate.search.placeholder}
            description={(l) =>
                l.ui.project.dialog.translate.search.description}
            bind:query
        />
        <Button
            background
            action={() => {
                translate();
            }}
            active={targetLocale !== undefined &&
                sourceLocale !== undefined &&
                !translating}
            tip={(l) => l.ui.project.button.translate.tip}
            label={(l) => l.ui.project.button.translate.label}
        ></Button>
        {#if translating}
            <Spinning />
        {/if}
    </div>
    {#if error}
        <Notice text={(l) => l.ui.project.error.translate} />
    {/if}
    <div class="options">
        <!-- Allow all of the languages that Google Translate supports. -->
        {#each destinationLocales as locale}
            <div
                class="option"
                class:selected={targetLocale !== undefined &&
                    localesAreEqual(targetLocale, locale)}
            >
                <Button
                    action={() => {
                        targetLocale = locale;
                    }}
                    active={!translating &&
                        (targetLocale === undefined ||
                            !localesAreEqual(targetLocale, locale)) &&
                        (sourceLocale === undefined ||
                            !localesAreEqual(sourceLocale, locale))}
                    tip={(l) => l.ui.project.button.destination}
                    background
                    ><LocaleName
                        locale={localeToString(locale)}
                        supported
                        showDraft={false}
                    /></Button
                >
            </div>
        {:else}&mdash;
        {/each}
    </div>
</Dialog>

<style>
    .options {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
    }

    .destination-header {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
    }

    .option {
        border: var(--wordplay-focus-width) solid transparent;
        border-radius: var(--wordplay-border-radius);
    }

    /* Selected locales aren't clickable, so highlight them to show selection.
       Uses the highlight color; the focus color is reserved for focus. */
    .option.selected {
        border-color: var(--wordplay-highlight-color);
    }

    .option.selected :global(.language) {
        color: var(--wordplay-foreground) !important;
    }
</style>
