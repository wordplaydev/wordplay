<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Commands, { Category } from '../editor/commands/Commands';
    import CommandDescription from './CommandDescription.svelte';
</script>

<table>
    <tbody>
        <tr>
            <td colspan="3"
                ><h1
                    ><LocalizedText
                        path={(l) => l.ui.dialog.help.subheader.moveCursor}
                    /></h1
                ></td
            >
        </tr>
        {#each Commands.filter((c) => c.category === Category.Cursor) as command}
            <CommandDescription {command} />
        {/each}
        <tr>
            <td colspan="3"
                ><h1
                    ><LocalizedText
                        path={(l) => l.ui.dialog.help.subheader.editCode}
                    /></h1
                ></td
            >
        </tr>
        {#each Commands.filter((c) => c.category === Category.Modify) as command}
            <CommandDescription {command} />
        {/each}
        <tr>
            <td colspan="3"
                ><h1
                    ><LocalizedText
                        path={(l) => l.ui.dialog.help.subheader.insertCode}
                    /></h1
                ></td
            >
        </tr>
        {#each Commands.filter((c) => c.category === Category.Insert) as command}
            <CommandDescription {command} />
        {/each}
        <tr>
            <td colspan="3"
                ><h1
                    ><LocalizedText
                        path={(l) => l.ui.dialog.help.subheader.debug}
                    /></h1
                ></td
            >
        </tr>
        {#each Commands.filter((c) => c.category === Category.Evaluate) as command}
            <CommandDescription {command} />
        {/each}
    </tbody>
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
