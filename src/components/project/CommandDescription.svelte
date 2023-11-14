<script lang="ts">
    import { locales } from '@db/Database';
    import { toShortcut, type Command } from '../editor/util/Commands';
    import Emoji from '@components/app/Emoji.svelte';

    export let command: Command;
</script>

<tr class="command">
    <td class="symbol"><Emoji>{command.symbol}</Emoji></td>
    <td class="shortcut"><em>{toShortcut(command)}</em></td>
    <td class="description">{$locales.get(command.description)}</td>
</tr>

<style>
    td {
        padding: var(--wordplay-spacing);

        vertical-align: top;
    }

    tr:nth-child(odd) {
        background: var(--wordplay-alternating-color);
    }
</style>
