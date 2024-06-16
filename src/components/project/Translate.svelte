<script lang="ts">
    import Feedback from '@components/app/Feedback.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { Projects, locales } from '@db/Database';
    import { functions } from '@db/firebase';
    import { getLanguageName } from '@locale/LanguageCode';
    import { SupportedLocales } from '@locale/Locale';
    import type Project from '@models/Project';
    import translateProject from '@models/translate';

    export let project: Project;

    let translating: boolean = false;
    let error: boolean = false;
    let show: boolean;

    $: projectLocales = project.getLocales().getLocales();
    $: localeCount = projectLocales.length - 1;
    $: primaryLocale = `${projectLocales[0].language}-${projectLocales[0].region}`;
    $: allLocales = projectLocales
        .map((l) => `${l.language}-${l.region}`)
        .sort();

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

            if (revisedProject) {
                Projects.reviseProject(revisedProject);
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
        tip: $locales.get((l) => l.ui.project.button.translate),
        label: `${getLanguageName(project.getPrimaryLanguage())}${
            localeCount < 2 ? '' : `+${localeCount - 1}`
        }…`,
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
                    active={supported !== primaryLocale}
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
