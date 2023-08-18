<script lang="ts">
    import type Project from '../../models/Project';
    import ProjectPreview from './ProjectPreview.svelte';
    import { DB, languages, locale } from '../../db/Database';
    import gotoProject from './gotoProject';
    import Button from '../widgets/Button.svelte';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';

    export let set: Project[];
    export let editable: boolean;
    export let beforePlay: undefined | ((project: Project) => void) = undefined;

    function sortProjects(projects: Project[]): Project[] {
        return projects.sort((a, b) =>
            a.getName().localeCompare(b.getName(), $languages)
        );
    }
</script>

<div class="projects">
    {#each sortProjects(set).filter((p) => p.listed) as project (project.id)}
        <ProjectPreview
            {project}
            action={() => {
                if (beforePlay) beforePlay(project);
                gotoProject(project, true);
            }}
            delay={Math.random() * set.length * 50}
            >{#if editable}<div class="controls">
                    <Button
                        tip={$locale.ui.description.editProject}
                        action={() => gotoProject(project, false)}>✎</Button
                    ><ConfirmButton
                        prompt={$locale.ui.prompt.deleteProject}
                        tip={$locale.ui.description.deleteProject}
                        action={() => DB.deleteProject(project.id)}
                        >⨉</ConfirmButton
                    ></div
                >{/if}</ProjectPreview
        >
    {/each}
</div>

<style>
    .projects {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: calc(2 * var(--wordplay-spacing));
        justify-content: flex-start;
    }

    .controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }
</style>
