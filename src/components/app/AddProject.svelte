<script lang="ts">
    import Dialog from '@components/widgets/Dialog.svelte';
    import { locales } from '@db/Database';
    import Button from '@components/widgets/Button.svelte';
    import ProjectPreview from './ProjectPreview.svelte';
    import { getTemplates } from '../../examples/examples';
    import Loading from './Loading.svelte';
    import type Project from '@models/Project';

    export let add: (newProject: Project) => void;

    // Whether to show the add dialog
    let adding = false;

    // The templates that can be created. Loaded on demand.
    let templates: Project[] = [];

    async function newProject() {
        adding = true;

        if (templates.length === 0)
            templates = await Promise.all(await getTemplates($locales));
    }
</script>

<p class="add">
    <Button
        tip={$locales.get((l) => l.ui.page.projects.button.newproject)}
        action={newProject}
        ><span style:font-size="xxx-large">+</span>
    </Button></p
>
<Dialog
    bind:show={adding}
    description={$locales.get((l) => l.ui.page.projects.add)}
>
    <div class="templates">
        {#each templates as project}
            <ProjectPreview {project} action={() => add(project)} />{:else}
            <Loading></Loading>
        {/each}
    </div>
</Dialog>

<style>
    .templates {
        margin-block-start: var(--wordplay-spacing);
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>
