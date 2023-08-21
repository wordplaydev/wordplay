<script lang="ts">
    import { locale } from '../../db/Database';
    import Commands, { Category } from '../editor/util/Commands';
    import Dialog from '../widgets/Dialog.svelte';
    import CommandDescription from './CommandDescription.svelte';

    export let show: boolean;
</script>

<Dialog bind:show>
    <table>
        <td colspan="3"><h1>{$locale.ui.header.moveCursor}</h1></td>
        {#each Commands.filter((c) => c.category === Category.Cursor) as command}
            <CommandDescription {command} />
        {/each}
        <td colspan="3"><h1>{$locale.ui.header.editCode}</h1></td>
        {#each Commands.filter((c) => c.category === Category.Modify) as command}
            <CommandDescription {command} />
        {/each}
        <td colspan="3"><h1>{$locale.ui.header.insertCode}</h1></td>
        {#each Commands.filter((c) => c.category === Category.Insert) as command}
            <CommandDescription {command} />
        {/each}
        <td colspan="3"><h1>{$locale.ui.header.debug}</h1></td>
        {#each Commands.filter((c) => c.category === Category.Evaluate) as command}
            <CommandDescription {command} />
        {/each}
    </table>
</Dialog>

<style>
    table {
        border-spacing: 0;
        border: none;
        width: 100%;
    }

    h1 {
        margin-top: var(--wordplay-spacing);
    }
</style>
