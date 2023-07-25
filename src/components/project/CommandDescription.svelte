<script lang="ts">
    import { config } from '../../db/Creator';
    import { toShortcut, type Command } from '../editor/util/Commands';

    export let command: Command;
</script>

<tr class="command">
    <td class="symbol">{command.symbol}</td>
    <td class="shortcut"><em>{toShortcut(command)}</em></td>
    <td class="description">{command.description($config.getLocale())}</td>
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
