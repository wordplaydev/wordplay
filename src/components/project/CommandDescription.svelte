<script lang="ts">
    import { creator } from '../../db/Creator';
    import { toShortcut, type Command } from '../editor/util/Commands';

    export let command: Command;
</script>

<div class="command"
    >{command.description($creator.getLocale())}
    <span class="shortcut">{toShortcut(command)}</span>
</div>

<style>
    .command {
        display: flex;
        flex-direction: row;
    }

    .shortcut {
        margin-left: auto;
    }
</style>
