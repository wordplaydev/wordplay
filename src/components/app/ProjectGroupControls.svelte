<!-- The projects page's organization controls: how projects are ordered, and
     the folders they're organized into. -->
<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import type { ProjectSort } from '@db/settings/ProjectSortSetting';

    interface Props {
        sort: ProjectSort;
        setSort: (sort: ProjectSort) => void;
        create: () => void;
        /** Whether a folder is chosen, and so whether there's anything for the
         *  delete control to act on. Which folder it is doesn't need saying
         *  here — the chosen folder is marked in the list. */
        selected: boolean;
        remove: () => void;
        /** Whether organizing is possible right now. False while a search is
         *  filtering the page: a destructive control must never act on state
         *  the creator can't see. */
        enabled: boolean;
    }

    let { sort, setSort, create, selected, remove, enabled }: Props = $props();
</script>

<div class="controls">
    <Mode
        modes={(l) => l.ui.page.projects.sort}
        choice={sort === 'edited' ? 1 : 0}
        select={(choice) => setSort(choice === 1 ? 'edited' : 'name')}
    />
    <Button
        tip={(l) => l.ui.page.projects.folder.button.create}
        action={create}
        active={enabled}
        uiid="new-folder"
        icon="📁+"
        background
    ></Button>
    <ConfirmButton
        tip={(l) => l.ui.page.projects.folder.confirm.delete.description}
        prompt={(l) => l.ui.page.projects.folder.confirm.delete.prompt}
        enabled={enabled && selected}
        action={remove}
        icon="📁🗑️"
        testid="delete-folder"
    ></ConfirmButton>
</div>

<style>
    .controls {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
