<script lang="ts">
    import Feedback from '@components/app/Feedback.svelte';
    import Loading from '@components/app/Loading.svelte';
    import LocaleName from '@components/settings/LocaleName.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { Projects, locales } from '@db/Database';
    import { functions } from '@db/firebase';
    import type LanguageCode from '@locale/LanguageCode';
    import { SupportedLocales } from '@locale/Locale';
    import type Project from '@models/Project';
    import translateProject from '@models/translate';

    export let project: Project;

    let translating: boolean = false;
    let error: boolean = false;
    let show: boolean;

    /** Translate the project into another language */
    async function translate(targetLanguage: string) {
        if (functions) {
            translating = true;
            const revisedProject = await translateProject(
                functions,
                project,
                targetLanguage as LanguageCode,
            );

            if (revisedProject) {
                Projects.reviseProject(revisedProject);
            } else {
                error = true;
            }

            translating = false;
            show = false;
        }
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
        label: `${$locales.get((l) => l.ui.project.button.translate.label)}…`,
    }}
>
    {#if translating}
        <Loading />
    {/if}
    {#if error}
        <Feedback>{$locales.get((l) => l.ui.project.error.translate)}</Feedback>
    {/if}
    <div class="options">
        {#each SupportedLocales as supported}
            {@const language = supported.split('-')[0]}
            <div class="option">
                <Button
                    action={() => translate(language)}
                    tip={$locales.get((l) => l.ui.dialog.locale.button.replace)}
                    ><LocaleName locale={supported} supported /></Button
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
</style>
