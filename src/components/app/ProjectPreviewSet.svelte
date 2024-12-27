<script lang="ts">
    import type Project from '../../db/projects/Project';
    import ProjectPreview from './ProjectPreview.svelte';
    import { locales } from '../../db/Database';
    import Button from '../widgets/Button.svelte';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';
    import { type Snippet } from 'svelte';
    import { withMonoEmoji } from '../../unicode/emoji';

    interface Props {
        set: Project[];
        edit:
            | {
                  description: string;
                  label: string;
                  action: (project: Project) => void;
              }
            | false;
        remove: (project: Project) =>
            | {
                  description: string;
                  prompt: string;
                  label: string;
                  action: () => void;
              }
            | false;
        copy:
            | {
                  description: string;
                  label: string;
                  action: (project: Project) => void;
              }
            | false;
        children?: Snippet;
    }

    let { set, edit, remove, copy, children }: Props = $props();

    function sortProjects(projects: Project[]): Project[] {
        return [...projects].sort((a, b) =>
            a.getName().localeCompare(b.getName(), $locales.getLanguages()),
        );
    }

    let listed = $derived(sortProjects(set).filter((p) => p.isListed()));
</script>

<div class="projects">
    {#each listed as project (project.getID())}
        {@const removeMeta = remove(project)}
        <ProjectPreview {project} link={project.getLink(true)}
            ><div class="controls">
                {#if edit}<Button
                        tip={edit.description}
                        action={() => (edit ? edit.action(project) : undefined)}
                        >{withMonoEmoji(edit.label)}</Button
                    >{/if}{#if copy}<Button
                        tip={copy.description}
                        action={() => copy.action(project)}
                        >{withMonoEmoji(copy.label)}</Button
                    >{/if}{#if removeMeta}<ConfirmButton
                        prompt={removeMeta.prompt}
                        tip={removeMeta.description}
                        action={() =>
                            removeMeta ? removeMeta.action() : undefined}
                        >{withMonoEmoji(removeMeta.label)}</ConfirmButton
                    >{/if}</div
            >{@render children?.()}</ProjectPreview
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
        justify-content: space-between;
    }

    .controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }
</style>
