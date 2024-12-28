<script lang="ts">
    import Feedback from '@components/app/Feedback.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { Projects, Settings, locales } from '@db/Database';
    import { functions } from '@db/firebase';
    import { SupportedLocales } from '@locale/LocaleText';
    import type Project from '@db/projects/Project';
    import translateProject from '@db/projects/translate';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    let translating: boolean = $state(false);
    let error: boolean = $state(false);
    let show: boolean = $state(false);

    let projectLocales = $derived(project.getLocales().getLocales());
    let localeCount = $derived(projectLocales.length - 1);
    let primaryLocale = $derived(
        `${projectLocales[0].language}-${projectLocales[0].region}`,
    );
    let allLocales = $derived(
        projectLocales.map((l) => `${l.language}-${l.region}`).sort(),
    );

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
                Settings.setLocalized('actual');
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
                l.region === primary.split('-')[1],
        );
        if (newLocale)
            Projects.reviseProject(project.withPrimaryLocale(newLocale));
    }
</script>

<Dialog
    bind:show
    description={{
        header: $locales.get((l) => l.ui.project.dialog.translate.header),
        explanation: $locales.get(
            (l) => l.ui.project.dialog.translate.explanation,
        ),
    }}
    button={{
        tip: $locales.get((l) => l.ui.project.button.translate.tip),
        label: `🌐 ${$locales.get((l) => l.ui.project.button.translate.label)}`,
    }}
>
    <Subheader>{$locales.get((l) => l.ui.project.subheader.source)}</Subheader>
    <div class="options">
        {#each allLocales as projectLocale, index}
            <div class="option">
                {#if projectLocale === primaryLocale}✔{/if}
                <Button
                    action={() => updatePrimaryLocale(index)}
                    active={projectLocale !== primaryLocale}
                    tip={$locales.get((l) => l.ui.project.button.primary)}
                    ><LocaleName locale={projectLocale} supported /></Button
                >
            </div>
        {/each}
    </div>
    <Subheader
        >{$locales.get((l) => l.ui.project.subheader.destination)}</Subheader
    >
    <div class="options">
        {#each SupportedLocales as supported}
            <div class="option">
                <Button
                    action={() => translate(supported)}
                    tip={$locales.get((l) => l.ui.dialog.locale.button.replace)}
                    ><LocaleName locale={supported} supported /></Button
                >
            </div>
        {:else}&mdash;
        {/each}
    </div>
    {#if translating}
        <Spinning />
    {/if}
    {#if error}
        <Feedback>{$locales.get((l) => l.ui.project.error.translate)}</Feedback>
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
