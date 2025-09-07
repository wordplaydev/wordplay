<script lang="ts">
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { type Snippet } from 'svelte';
    import type Project from '../../db/projects/Project';
    import Button from '../widgets/Button.svelte';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';
    import ProjectPreview from './ProjectPreview.svelte';

    interface Props {
        project: Project;
        searchTerm: string;
        edit?:
            | {
                  description: LocaleTextAccessor;
                  label: string;
                  action: (project: Project) => void;
              }
            | false;
        remove?: (project: Project) =>
            | {
                  description: LocaleTextAccessor;
                  prompt: LocaleTextAccessor;
                  label: string;
                  action: () => void;
              }
            | false;
        copy?:
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
        project,
        searchTerm,
        edit = false,
        remove = () => false,
        copy = false,
        children,
        anonymize = true,
        showCollaborators = false,
    }: Props = $props();

    // Highlight matching text in search results
    function highlightText(text: string, searchTerm: string): string {
        if (!searchTerm.trim()) return text;
        
        const searchLower = searchTerm.toLowerCase();
        const textLower = text.toLowerCase();
        const index = textLower.indexOf(searchLower);
        
        if (index === -1) return text;
        
        const before = text.substring(0, index);
        const match = text.substring(index, index + searchTerm.length);
        const after = text.substring(index + searchTerm.length);
        
        return `${before}<mark class="search-highlight">${match}</mark>${after}`;
    }

    // Get highlighted project name
    let highlightedName = $derived(highlightText(project.getName(), searchTerm));
</script>

<div class="project-with-highlight">
    <ProjectPreview
        {project}
        link={project.getLink(true)}
        {anonymize}
        {showCollaborators}
    >
        <div class="controls">
            {#if edit}
                <Button
                    tip={edit.description}
                    action={() => (edit ? edit.action(project) : undefined)}
                    icon={edit.label}
                ></Button>
            {/if}
            {#if copy}
                <Button
                    tip={copy.description}
                    action={() => copy.action(project)}
                    icon={copy.label}
                ></Button>
            {/if}
            {@const removeMeta = remove(project)}
            {#if removeMeta}
                <ConfirmButton
                    prompt={removeMeta.prompt}
                    tip={removeMeta.description}
                    action={() =>
                        removeMeta ? removeMeta.action() : undefined}
                    icon={removeMeta.label}
                ></ConfirmButton>
            {/if}
        </div>
        {@render children?.()}
    </ProjectPreview>
    
    <!-- Custom name display with highlighting -->
    <div class="name">
        <a href={project.getLink(true)}>
            {#if project.getName().length === 0}
                <em class="untitled">&mdash;</em>
            {:else}
                {@html highlightedName}
            {/if}
        </a>
    </div>
</div>

<style>
    .project-with-highlight {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        min-width: 12em;
    }

    .name {
        display: flex;
        flex-direction: column;
    }

    .name a {
        text-decoration: none;
        color: var(--wordplay-foreground);
    }

    .name a:hover {
        text-decoration: underline;
    }

    .untitled {
        color: var(--wordplay-inactive-color);
    }

    .controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    :global(.search-highlight) {
        background-color: #fbbf24;
        color: #1f2937;
        padding: 0 2px;
        border-radius: 2px;
        font-weight: 600;
    }
</style> 