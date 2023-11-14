<script lang="ts">
    import { locales } from '../../db/Database';
    import Commands, { Category } from '../editor/util/Commands';
    import CommandDescription from './CommandDescription.svelte';
</script>

<table>
    <td colspan="3"
        ><h1>{$locales.get((l) => l.ui.dialog.help.subheader.moveCursor)}</h1
        ></td
    >
    {#each Commands.filter((c) => c.category === Category.Cursor) as command}
        <CommandDescription {command} />
    {/each}
    <td colspan="3"
        ><h1>{$locales.get((l) => l.ui.dialog.help.subheader.editCode)}</h1></td
    >
    {#each Commands.filter((c) => c.category === Category.Modify) as command}
        <CommandDescription {command} />
    {/each}
    <td colspan="3"
        ><h1>{$locales.get((l) => l.ui.dialog.help.subheader.insertCode)}</h1
        ></td
    >
    {#each Commands.filter((c) => c.category === Category.Insert) as command}
        <CommandDescription {command} />
    {/each}
    <td colspan="3"
        ><h1>{$locales.get((l) => l.ui.dialog.help.subheader.debug)}</h1></td
    >
    {#each Commands.filter((c) => c.category === Category.Evaluate) as command}
        <CommandDescription {command} />
    {/each}
</table>

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
