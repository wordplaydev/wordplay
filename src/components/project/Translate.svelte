<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales, Projects } from '@db/Database';
    import { functions } from '@db/firebase';
    import type Project from '@db/projects/Project';
    import translateProject from '@db/projects/translate';
    import { Languages } from '@locale/LanguageCode';
    import getTranslatableLocales from '@locale/getTranslatableLocales';
    import {
        localesAreEqual,
        localeToString,
        type Locale,
    } from '@locale/Locale';
    import { Regions } from '@locale/Regions';
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

    let destinationLocales = $derived.by(() => {
        const langs = $locales.getLanguages();
        const q = query.trim().toLocaleLowerCase(langs);
        const offered = getTranslatableLocales();
        if (q.length === 0) return offered;
        return offered.filter((locale) => {
            const info = Languages[locale.language];
            const haystack = [
                info?.name ?? '', // native name, e.g. "español", "日本語"
                info?.en ?? '', // Latin name, e.g. "Spanish"
                ...locale.regions, // region code, e.g. "MX"
                ...locale.regions.map((r) => Regions[r]?.en ?? ''), // region name, e.g. "Mexico"
            ]
                .join(' ')
                .toLocaleLowerCase(langs);
            return haystack.includes(q);
        });
    });

    /** Translate the project into another language */
    async function translate() {
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
        <TextField
            id="translate-destination-search"
            placeholder={(l) =>
                l.ui.project.dialog.translate.search.placeholder}
            description={(l) =>
                l.ui.project.dialog.translate.search.description}
            bind:text={query}
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
