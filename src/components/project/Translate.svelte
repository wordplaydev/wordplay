<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { Projects } from '@db/Database';
    import { functions } from '@db/firebase';
    import type Project from '@db/projects/Project';
    import translateProject from '@db/projects/translate';
    import { TranslatableLocales } from '@locale/LanguageCode';
    import {
        localesAreEqual,
        localeToString,
        type Locale,
    } from '@locale/Locale';
    import { CONFIRM_SYMBOL, LOCALE_SYMBOL } from '@parser/Symbols';

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

    let sourceLocale = $state<Locale | undefined>(
        project.getLocales().getLocales()[0],
    );

    let targetLocale = $state<Locale | undefined>(undefined);

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
    bind:show
    header={(l) => l.ui.project.dialog.translate.header}
    explanation={(l) => l.ui.project.dialog.translate.explanation}
    button={{
        tip: (l) => l.ui.project.button.translate.tip,
        icon: LOCALE_SYMBOL,
        label: (l) => l.ui.project.button.translate.label,
    }}
>
    <Subheader text={(l) => l.ui.project.subheader.source} />
    <div class="options">
        {#each projectLocales as locale, index}
            <div class="option">
                <Button
                    action={() => updatePrimaryLocale(index)}
                    active={!translating &&
                        (sourceLocale === undefined ||
                            !localesAreEqual(locale, sourceLocale))}
                    tip={(l) => l.ui.project.button.primary}
                    icon={sourceLocale && localesAreEqual(locale, sourceLocale)
                        ? CONFIRM_SYMBOL
                        : undefined}
                    ><LocaleName
                        locale={localeToString(locale)}
                        supported
                        showDraft={false}
                    /></Button
                >
            </div>
        {/each}
    </div>
    <Subheader text={(l) => l.ui.project.subheader.destination} />
    <div class="options">
        <!-- Allow all of the languages that Google Translate supports. -->
        {#each TranslatableLocales as locale}
            <div class="option">
                <Button
                    action={() => {
                        targetLocale = locale;
                    }}
                    active={!translating &&
                        (targetLocale === undefined ||
                            !localesAreEqual(targetLocale, locale)) &&
                        (sourceLocale === undefined ||
                            !localesAreEqual(sourceLocale, locale))}
                    tip={(l) => l.ui.dialog.locale.button.replace}
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
    {#if error}
        <Notice text={(l) => l.ui.project.error.translate} />
    {/if}
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
</style>
