<script lang="ts">
    import Commands, { Category, Visibility } from '../editor/util/Commands';
    import Dialog from '../widgets/Dialog.svelte';
    import CommandDescription from './CommandDescription.svelte';

    export let show: boolean;
</script>

<Dialog bind:show>
    <h1>Cursor</h1>
    <ul>
        {#each Commands.filter((c) => c.visible !== Visibility.Invisible && c.category === Category.Cursor) as command}
            <li><CommandDescription {command} /></li>
        {/each}
    </ul>

    <h2>Edit code</h2>
    <ul>
        {#each Commands.filter((c) => c.visible !== Visibility.Invisible && c.category === Category.Modify) as command}
            <li><CommandDescription {command} /></li>
        {/each}
    </ul>

    <h2>Insert symbols</h2>
    <ul>
        {#each Commands.filter((c) => c.visible !== Visibility.Invisible && c.category === Category.Insert) as command}
            <li><CommandDescription {command} /></li>
        {/each}
    </ul>

    <h2>Debug</h2>
    <ul>
        {#each Commands.filter((c) => c.visible !== Visibility.Invisible && c.category === Category.Evaluate) as command}
            <li><CommandDescription {command} /></li>
        {/each}
    </ul>
</Dialog>
