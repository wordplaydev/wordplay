<script lang="ts">
    import type Project from '../../models/Project';
    import ProjectPreview from './ProjectPreview.svelte';
    import { Projects, languages, locale } from '../../db/Database';
    import getProjectLink from './getProjectLink';
    import Button from '../widgets/Button.svelte';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';
    import { EDIT_SYMBOL } from '../../parser/Symbols';
    import { goto } from '$app/navigation';

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
                getProjectLink(project, true);
            }}
            delay={Math.random() * set.length * 50}
            >{#if editable}<div class="controls">
                    <Button
                        tip={$locale.ui.page.projects.button.edit}
                        action={() => goto(getProjectLink(project, false))}
                        >{EDIT_SYMBOL}</Button
                    ><ConfirmButton
                        prompt={$locale.ui.page.projects.confirm.archive.prompt}
                        tip={$locale.ui.page.projects.confirm.archive
                            .description}
                        action={() => Projects.archiveProject(project.id)}
                        >🗑️</ConfirmButton
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
