<script lang="ts">
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { type Snippet } from 'svelte';
    import { locales } from '../../db/Database';
    import type Project from '../../db/projects/Project';
    import ProjectPreviewWithHighlight from './ProjectPreviewWithHighlight.svelte';

    interface Props {
        set: Project[];
        searchTerm: string;
        edit:
            | {
                  description: LocaleTextAccessor;
                  label: string;
                  action: (project: Project) => void;
              }
            | false;
        remove: (project: Project) =>
            | {
                  description: LocaleTextAccessor;
                  prompt: LocaleTextAccessor;
                  label: string;
                  action: () => void;
              }
            | false;
        copy:
            | {
                  description: LocaleTextAccessor;
                  label: string;
                  action: (project: Project) => void;
              }
            | false;
        children?: Snippet;
        anonymize?: boolean;
        showCollaborators?: boolean;
    }

    let {
        set,
        searchTerm,
        edit,
        remove,
        copy,
        children,
        anonymize = true,
        showCollaborators = false,
    }: Props = $props();

    function sortProjects(projects: Project[]): Project[] {
        return [...projects].sort((a, b) =>
            a.getName().localeCompare(b.getName(), $locales.getLanguages()),
        );
    }

    let listed = $derived(sortProjects(set).filter((p) => p.isListed()));
</script>

<div class="projects">
    {#each listed as project (project.getID())}
        <ProjectPreviewWithHighlight
            {project}
            {searchTerm}
            {edit}
            {remove}
            {copy}
            {anonymize}
            {showCollaborators}
        >
            {@render children?.()}
        </ProjectPreviewWithHighlight>
    {/each}
</div>

<style>
    .projects {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: calc(2 * var(--wordplay-spacing));
    }
</style> 