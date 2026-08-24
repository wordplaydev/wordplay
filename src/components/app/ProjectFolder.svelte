<!-- One folder on the projects page: a header that names it and says how much
     is in it, and either its contents or a preview of them. -->
<script lang="ts">
    import ProjectPreview from '@components/app/ProjectPreview.svelte';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import type {
        ProjectAction,
        ProjectConfirmAction,
        ProjectInteraction,
    } from '@components/app/projectControls';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import type { ProjectSort } from '@db/settings/ProjectSortSetting';
    import type { ResolvedFolder } from '../../routes/[[locale]]/projects/folders';

    interface Props {
        folder: ResolvedFolder;
        /** Whether this is the folder the delete control would act on. */
        selected: boolean;
        /** Whether a project being dragged would land here. */
        candidate: boolean;
        sort: ProjectSort;
        /** Choose this folder. Called for a click anywhere in it that isn't a
         *  project tile, and when focus enters one of its own controls. */
        select: () => void;
        toggle: () => void;
        rename: (name: string) => void;
        /** How the project tiles inside take part in choosing and moving. */
        interaction: ProjectInteraction;
        /** The rest of a project tile's controls (edit, remix, archive). */
        edit: ProjectAction;
        copy: ProjectAction;
        remove: ProjectConfirmAction;
    }

    let {
        folder,
        selected,
        candidate,
        sort,
        select,
        toggle,
        rename,
        interaction,
        edit,
        copy,
        remove,
    }: Props = $props();

    const contentsID = $derived(`folder-contents-${folder.id}`);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- Clicking anywhere in a folder that isn't one of its projects chooses the
     folder — the whole thing is the target, not just its name. It stays a
     plain section rather than a control because it contains controls; the
     choice is marked with aria-current, and the keys that act on it are named
     in the list's instructions. The click has a keyboard equivalent, just not
     on this element: focus entering the folder's own controls chooses it too,
     so tabbing through never leaves the choice behind — but focus landing on a
     project inside it does not, or moving one in here would take the choice
     away from the project that was just moved. -->
<section
    class="folder"
    class:selected
    class:candidate
    data-folder={folder.id}
    aria-current={selected ? 'true' : undefined}
    onfocusin={(event) =>
        event.target instanceof Element &&
        event.target.closest('.project') === null
            ? select()
            : undefined}
    onclick={(event) =>
        event.target instanceof Element &&
        event.target.closest('.project') === null
            ? select()
            : undefined}
>
    <div class="header">
        <!-- The icon says which way the folder is: shut when its contents are
             hidden, open when they're showing. Monochrome like every other
             control here, and large enough to be a comfortable target. -->
        <Button
            tip={folder.collapsed
                ? (l) => l.ui.page.projects.folder.button.expand
                : (l) => l.ui.page.projects.folder.button.collapse}
            action={toggle}
            expanded={!folder.collapsed}
            controls={contentsID}
            classes="folder-disclosure"
            icon={folder.collapsed ? '📁' : '📂'}
        ></Button>
        <TextField
            id="folder-name-{folder.id}"
            text={folder.name}
            description={(l) => l.ui.page.projects.folder.name.description}
            placeholder={(l) => l.ui.page.projects.folder.name.placeholder}
            dwelled={(name) => rename(name)}
            done={(name) => rename(name)}
        />
    </div>
    <div id={contentsID} class="contents">
        {#if folder.collapsed}
            <!-- Collapsed, a folder still shows what's in it: the tiles alone,
                 small and unnamed, so a creator can recognize the contents
                 without opening it. They stay links, so anything visible is
                 still reachable. -->
            <div class="peek">
                {#each folder.projects as project (project.getID())}
                    <ProjectPreview {project} name={false} size={2} />
                {/each}
            </div>
        {:else}
            <ProjectPreviewSet
                set={folder.projects}
                {sort}
                {interaction}
                {edit}
                {copy}
                {remove}
                anonymize={false}
                showCollaborators={true}
            />
        {/if}
    </div>
</section>

<style>
    /* A folder is a container, so it looks like one: its own surface. The
       surface alone is enough — an outline around something that isn't chosen
       reads as if it were. */
    .folder {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-focus-width) solid transparent;
        background: var(--wordplay-alternating-color);
        cursor: pointer;
    }

    /* Same hover as the project tiles, so both read as clickable. */
    .folder:hover {
        background: var(--wordplay-hover-light);
    }

    /* Chosen is drawn exactly the same way on a project. */
    .folder.selected {
        background: var(--wordplay-hover-light);
        border-color: var(--wordplay-highlight-color);
        border-style: dashed;
    }

    /* Where a dragged project would land. Solid rather than dashed, so a drop
       target is never mistaken for the current choice. */
    .folder.candidate {
        border-color: var(--wordplay-highlight-color);
        border-style: solid;
    }

    .header {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        flex-wrap: wrap;
    }

    .peek {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    /* A rule down the inline start, so what's inside the folder is visibly
       inside it rather than merely nudged over. */
    .contents {
        padding-inline-start: var(--wordplay-spacing);
        margin-inline-start: var(--wordplay-spacing);
        border-inline-start: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    /* Big enough to be a comfortable target, which the default control size
       isn't for a glyph this important. */
    :global(button.folder-disclosure) {
        font-size: 24pt;
        min-width: 44px;
        min-height: 44px;
    }
</style>
