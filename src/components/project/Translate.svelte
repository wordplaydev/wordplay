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
    import { TranslatableLanguages } from '@locale/LanguageCode';
    import { toLocale } from '@locale/LocaleText';
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

    let projectLocales = $derived(project.getLocales().getLocales());
    let primaryLocale = $derived(toLocale(projectLocales[0]));
    let allLocales = $derived(projectLocales.map((l) => toLocale(l)).sort());

    /** Translate the project into another language */
    async function translate(targetLocaleCode: string) {
        if (functions) {
            translating = true;
            const revisedProject = await translateProject(
                functions,
                project,
                targetLocaleCode,
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
        const primary = allLocales[index];
        const newLocale = projectLocales.find(
            (l) =>
                l.language === primary.split('-')[0] &&
                l.regions.includes(primary.split('-')[1]),
        );
        if (newLocale)
            Projects.reviseProject(project.withPrimaryLocale(newLocale));
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
        {#each allLocales as projectLocale, index}
            <div class="option">
                {#if projectLocale === primaryLocale}✔{/if}
                <Button
                    action={() => updatePrimaryLocale(index)}
                    active={projectLocale !== primaryLocale}
                    tip={(l) => l.ui.project.button.primary}
                    ><LocaleName locale={projectLocale} supported /></Button
                >
            </div>
        {/each}
    </div>
    <Subheader text={(l) => l.ui.project.subheader.destination} />
    <div class="options">
        <!-- Allow all of the languages that Google Translate supports. -->
        {#each TranslatableLanguages as language}
            <div class="option">
                <Button
                    action={() => translate(language)}
                    tip={(l) => l.ui.dialog.locale.button.replace}
                    ><LocaleName locale={language} supported /></Button
                >
            </div>
        {:else}&mdash;
        {/each}
    </div>
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
