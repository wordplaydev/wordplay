<script lang="ts">
    import { type Snippet } from 'svelte';
    import { disconnected, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import sortProjects from '@db/projects/sortProjects';
    import type {
        ProjectAction,
        ProjectConfirmAction,
        ProjectInteraction,
    } from '@components/app/projectControls';
    import type { ProjectSort } from '@db/settings/ProjectSortSetting';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import ProjectPreview from '@components/app/ProjectPreview.svelte';

    interface Props {
        set: Project[];
        edit: ProjectAction;
        remove: ProjectConfirmAction;
        copy: ProjectAction;
        children?: Snippet;
        anonymize?: boolean;
        showCollaborators?: boolean;
        searchTerm?: string;
        /** Map from project ID to match snippet, for results matched on source content */
        matchTexts?: Map<string, string>;
        /** How to order the set. The projects page decides this once and hands
         *  it to every set on the page, so the top level and each folder agree;
         *  everywhere else keeps the alphabetical default. */
        sort?: ProjectSort;
        /** The folder a project is in, shown under its name. Only used where
         *  folders aren't drawn — a flattened search result, which would
         *  otherwise give no clue where the project actually lives. */
        folderName?: (project: Project) => string | undefined;
        /** How these tiles take part in choosing and moving projects. Omitted
         *  everywhere but the projects page, where tiles are just tiles. */
        interaction?: ProjectInteraction;
    }

    let {
        set,
        edit,
        remove,
        copy,
        children,
        anonymize = true,
        showCollaborators = false,
        searchTerm = '',
        matchTexts = undefined,
        sort = 'name',
        folderName = undefined,
        interaction = undefined,
    }: Props = $props();

    let listed = $derived(
        sortProjects(set, sort, $locales.getLanguages()).filter((p) =>
            p.isListed(),
        ),
    );
</script>

<div class="projects">
    {#each listed as project (project.getID())}
        {@const removeMeta = remove(project)}
        <ProjectPreview
            {project}
            link={project.getLink(true)}
            {anonymize}
            {showCollaborators}
            {searchTerm}
            {...matchTexts?.has(project.getID())
                ? { matchText: matchTexts.get(project.getID())! }
                : {}}
            {...(() => {
                const folder = folderName?.(project);
                return folder === undefined ? {} : { folderName: folder };
            })()}
            {...interaction === undefined
                ? {}
                : {
                      selected: interaction.selected(project),
                      select: () => interaction.select(project),
                      key: (event: KeyboardEvent) =>
                          interaction.key(event, project),
                      grab: (event: PointerEvent) =>
                          interaction.grab(event, project),
                  }}
            ><div class="controls">
                {#if edit}<Button
                        tip={edit.description}
                        action={() => (edit ? edit.action(project) : undefined)}
                        icon={edit.label}
                        background
                    ></Button>{/if}{#if copy}<Button
                        tip={copy.description}
                        action={() => copy.action(project)}
                        icon={copy.label}
                        background
                    ></Button>{/if}{#if removeMeta}<ConfirmButton
                        prompt={removeMeta.prompt}
                        tip={removeMeta.description}
                        action={() =>
                            removeMeta ? removeMeta.action() : undefined}
                        icon={removeMeta.label}
                        enabled={!$disconnected}
                        background
                    ></ConfirmButton>{/if}</div
            >{@render children?.()}</ProjectPreview
        >
    {/each}
</div>

<style>
    /* A grid so that when the page is wide enough for multiple columns,
       previews share a consistent inline-start across rows. */
    .projects {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 28em), 1fr));
        column-gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        align-items: start;
        justify-items: start;
    }

    .controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }
</style>
