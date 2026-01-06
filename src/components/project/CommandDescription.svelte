<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { toShortcut, type Command } from '../editor/commands/Commands';

    interface Props {
        command: Command;
    }

    let { command }: Props = $props();
</script>

<tr class="command">
    <td class="symbol"><Emoji>{command.symbol}</Emoji></td>
    <td class="shortcut"><em>{toShortcut(command)}</em></td>
    <td class="description"><LocalizedText path={command.description} /></td>
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
